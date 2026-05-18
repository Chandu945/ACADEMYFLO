import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserStatus } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import { canManageStaff, staffBelongsToAcademy } from '@domain/identity/rules/staff.rules';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderStaffDeactivatedEmail } from '../../notifications/templates/staff-deactivated-template';
import { AuthErrors, StaffErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type {
  StaffQualificationInfo,
  StaffSalaryConfig,
} from '@domain/identity/entities/user.entity';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserAuthCachePort } from '../../identity/ports/user-auth-cache.port';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';

export interface SetStaffStatusInput {
  ownerUserId: string;
  ownerRole: UserRole;
  staffId: string;
  status: UserStatus;
}

export interface SetStaffStatusOutput {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  academyId: string | null;
  // ISO 8601 wire format (see list-staff.usecase.ts for rationale).
  startDate: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  whatsappNumber: string | null;
  mobileNumber: string | null;
  address: string | null;
  qualificationInfo: StaffQualificationInfo | null;
  salaryConfig: StaffSalaryConfig | null;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export class SetStaffStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly emailSender?: EmailSenderPort,
    private readonly academyRepo?: AcademyRepository,
    private readonly deviceTokenRepo?: DeviceTokenRepository,
    /** H1 identity-audit fix: bust the JwtAuthGuard cache so a deactivated
     *  staff member's old access token stops working immediately rather
     *  than surviving the 5-min cache TTL. */
    private readonly userAuthCache?: UserAuthCachePort,
  ) {}

  async execute(input: SetStaffStatusInput): Promise<Result<SetStaffStatusOutput, AppError>> {
    const check = canManageStaff(input.ownerRole);
    if (!check.allowed) {
      return err(AuthErrors.notOwner());
    }

    const owner = await this.userRepo.findById(input.ownerUserId);
    if (!owner || !owner.academyId) {
      return err(StaffErrors.academyRequired());
    }

    const staff = await this.userRepo.findById(input.staffId);
    if (!staff) {
      return err(StaffErrors.notFound(input.staffId));
    }

    if (staff.role !== 'STAFF') {
      return err(StaffErrors.notStaff());
    }

    const belongsCheck = staffBelongsToAcademy(staff, owner.academyId);
    if (!belongsCheck.allowed) {
      return err(StaffErrors.notInAcademy());
    }

    // M3 fix: same-status submission is a no-op success. Without this,
    // re-submitting the current status would re-save, re-revoke sessions,
    // re-remove device tokens, and add a noise audit entry. Matches the
    // change-student-status / change-event-status pattern.
    if (input.status === staff.status) {
      return ok(toStaffStatusResponse(staff));
    }

    const newTokenVersion =
      input.status === 'INACTIVE' ? staff.tokenVersion + 1 : staff.tokenVersion;

    const updated = User.reconstitute(input.staffId, {
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: input.status,
      passwordHash: staff.passwordHash,
      academyId: staff.academyId,
      tokenVersion: newTokenVersion,
      audit: updateAuditFields(staff.audit),
      softDelete: staff.softDelete,
      startDate: staff.startDate,
      gender: staff.gender,
      whatsappNumber: staff.whatsappNumber,
      mobileNumber: staff.mobileNumber,
      address: staff.address,
      qualificationInfo: staff.qualificationInfo,
      salaryConfig: staff.salaryConfig,
      profilePhotoUrl: staff.profilePhotoUrl,
    });

    await this.userRepo.save(updated);
    // H1 identity-audit fix: explicit cache bust. The staff's tokenVersion
    // changed AND their status flipped — both fields are cached. Without
    // this, an INACTIVE staff's old access token keeps working for up to
    // 5 min because the cache still reports them ACTIVE.
    await this.userAuthCache?.invalidate(input.staffId);

    let cancelledPrCount = 0;
    if (input.status === 'INACTIVE') {
      await this.sessionRepo.revokeAllByUserIds([input.staffId]);
      await this.deviceTokenRepo?.removeByUserIds([input.staffId]);
      // Cascade: cancel any PENDING PRs this staff filed before deactivation.
      // Without this, the owner's approval queue keeps surfacing rows from a
      // staff member who's no longer around to clarify them — the staff analog
      // of the student-delete PENDING-PR cascade (see
      // soft-delete-student.usecase.ts:116). Soft-cancel (status → CANCELLED)
      // rather than hard-delete so the student's PR history still shows the
      // request existed. Count goes to the audit context so the deactivation
      // event captures the cascade scope.
      cancelledPrCount = await this.paymentRequestRepo.cancelPendingByStaffAndAcademy(
        input.staffId,
        owner.academyId,
      );
    }

    await this.auditRecorder.record({
      academyId: owner.academyId,
      actorUserId: input.ownerUserId,
      action: input.status === 'INACTIVE' ? 'STAFF_DEACTIVATED' : 'STAFF_REACTIVATED',
      entityType: 'USER',
      entityId: input.staffId,
      context: {
        staffName: staff.fullName,
        fromStatus: staff.status,
        toStatus: input.status,
        ...(input.status === 'INACTIVE'
          ? { cancelledPendingPaymentRequests: String(cancelledPrCount) }
          : {}),
      },
    });

    // Fire-and-forget: notify staff about status change.
    // L3 fix: drop the `?? ''` fallback. We already verified
    // `staffBelongsToAcademy(staff, owner.academyId)` above so
    // `staff.academyId === owner.academyId` (non-empty). The fallback
    // was dead defensive code.
    if (this.emailSender && this.academyRepo) {
      const academy = await this.academyRepo.findById(owner.academyId);
      this.emailSender
        .send({
          to: staff.emailNormalized,
          subject: `Account ${input.status === 'INACTIVE' ? 'Deactivated' : 'Reactivated'} - ${academy?.academyName ?? 'Your Academy'}`,
          html: renderStaffDeactivatedEmail({
            staffName: staff.fullName,
            academyName: academy?.academyName ?? 'Your Academy',
            newStatus: input.status,
          }),
        })
        .catch(() => {});
    }

    return ok(toStaffStatusResponse(updated));
  }
}

function toStaffStatusResponse(u: User): SetStaffStatusOutput {
  return {
    id: u.id.toString(),
    fullName: u.fullName,
    email: u.emailNormalized,
    phoneNumber: u.phoneE164,
    role: u.role,
    status: u.status,
    academyId: u.academyId,
    startDate: u.startDate?.toISOString() ?? null,
    gender: u.gender,
    whatsappNumber: u.whatsappNumber,
    mobileNumber: u.mobileNumber,
    address: u.address,
    qualificationInfo: u.qualificationInfo,
    salaryConfig: u.salaryConfig,
    profilePhotoUrl: u.profilePhotoUrl,
    createdAt: u.audit.createdAt.toISOString(),
    updatedAt: u.audit.updatedAt.toISOString(),
  };
}
