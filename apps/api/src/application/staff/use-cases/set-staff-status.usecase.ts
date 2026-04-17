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
import type { UserRole } from '@playconnect/contracts';
import type { StaffQualificationInfo, StaffSalaryConfig } from '@domain/identity/entities/user.entity';

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
  startDate: Date | null;
  gender: 'MALE' | 'FEMALE' | null;
  whatsappNumber: string | null;
  mobileNumber: string | null;
  address: string | null;
  qualificationInfo: StaffQualificationInfo | null;
  salaryConfig: StaffSalaryConfig | null;
  profilePhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SetStaffStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly emailSender?: EmailSenderPort,
    private readonly academyRepo?: AcademyRepository,
    private readonly deviceTokenRepo?: DeviceTokenRepository,
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
    // Note: user auth cache (user:auth:{staffId}) will be invalidated on next
    // JWT check via tokenVersion mismatch, and expires naturally within 5 min TTL.

    if (input.status === 'INACTIVE') {
      await this.sessionRepo.revokeAllByUserIds([input.staffId]);
      await this.deviceTokenRepo?.removeByUserIds([input.staffId]);
    }

    // Fire-and-forget: notify staff about status change
    if (this.emailSender && this.academyRepo) {
      const academy = await this.academyRepo.findById(staff.academyId ?? '');
      this.emailSender.send({
        to: staff.emailNormalized,
        subject: `Account ${input.status === 'INACTIVE' ? 'Deactivated' : 'Reactivated'} - ${academy?.academyName ?? 'Your Academy'}`,
        html: renderStaffDeactivatedEmail({
          staffName: staff.fullName,
          academyName: academy?.academyName ?? 'Your Academy',
          newStatus: input.status,
        }),
      }).catch(() => {});
    }

    return ok({
      id: updated.id.toString(),
      fullName: updated.fullName,
      email: updated.emailNormalized,
      phoneNumber: updated.phoneE164,
      role: updated.role,
      status: updated.status,
      academyId: updated.academyId,
      startDate: updated.startDate,
      gender: updated.gender,
      whatsappNumber: updated.whatsappNumber,
      mobileNumber: updated.mobileNumber,
      address: updated.address,
      qualificationInfo: updated.qualificationInfo,
      salaryConfig: updated.salaryConfig,
      profilePhotoUrl: updated.profilePhotoUrl,
      createdAt: updated.audit.createdAt,
      updatedAt: updated.audit.updatedAt,
    });
  }
}
