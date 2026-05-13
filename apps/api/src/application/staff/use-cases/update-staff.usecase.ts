import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import { canManageStaff, staffBelongsToAcademy } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import { Email } from '@domain/identity/value-objects/email.vo';
import { Phone } from '@domain/identity/value-objects/phone.vo';
import type { UserRole } from '@academyflo/contracts';
import type {
  StaffQualificationInfo,
  StaffSalaryConfig,
} from '@domain/identity/entities/user.entity';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderStaffCredentialsChangedEmail } from '../../notifications/templates/staff-credentials-changed-template';

export interface UpdateStaffInput {
  ownerUserId: string;
  ownerRole: UserRole;
  staffId: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  startDate?: Date | null;
  gender?: 'MALE' | 'FEMALE' | null;
  whatsappNumber?: string | null;
  mobileNumber?: string | null;
  address?: string | null;
  qualificationInfo?: StaffQualificationInfo | null;
  salaryConfig?: StaffSalaryConfig | null;
  profilePhotoUrl?: string | null;
}

export interface UpdateStaffOutput {
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

export class UpdateStaffUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Used to revoke active sessions when the owner resets a staff
     * member's password (H3 fix). Optional so legacy fixtures keep
     * working — without it, password rotation is incomplete (existing
     * JWTs stay valid until natural expiry).
     */
    private readonly sessionRepo?: SessionRepository,
    /**
     * Used to send the credential-changed email (M2 fix). Optional.
     */
    private readonly emailSender?: EmailSenderPort,
    /**
     * Used to resolve the academy name for the credential-changed email.
     * Optional — falls back to "Your Academy" if not wired.
     */
    private readonly academyRepo?: AcademyRepository,
  ) {}

  async execute(input: UpdateStaffInput): Promise<Result<UpdateStaffOutput, AppError>> {
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

    // Normalize at the use-case boundary so we don't depend on the DTO layer
    // (a non-DTO caller — e.g., a future internal worker — would otherwise
    // bypass normalization and let " PRIYA@EXAMPLE.COM " slip past the dedup
    // check while still hitting the unique index at save time).
    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : undefined;
    const trimmedPhone = input.phoneNumber ? input.phoneNumber.trim() : undefined;

    // Check uniqueness for changed email
    if (normalizedEmail && normalizedEmail !== staff.emailNormalized) {
      const existing = await this.userRepo.findByEmail(normalizedEmail);
      if (existing) {
        return err(AuthErrors.duplicateEmail());
      }
    }

    // Check uniqueness for changed phone
    if (trimmedPhone && trimmedPhone !== staff.phoneE164) {
      const existing = await this.userRepo.findByPhone(trimmedPhone);
      if (existing) {
        return err(AuthErrors.duplicatePhone());
      }
    }

    const newPasswordHash = input.password
      ? await this.passwordHasher.hash(input.password)
      : staff.passwordHash;

    // H3 fix: bump tokenVersion when ANY login credential changes (password,
    // email, or phone). Existing JWTs encode the prior tokenVersion and
    // become invalid on the next auth check, so credential rotation is
    // immediately effective. Session revocation below clears the sessions
    // table; the tokenVersion bump closes the residual access-JWT window
    // (otherwise active JWTs stay valid until natural expiry, leaving a
    // 5-15 minute hole after the rotation).
    const passwordChanged = !!input.password;
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== staff.emailNormalized;
    const phoneChanged = trimmedPhone !== undefined && trimmedPhone !== staff.phoneE164;
    const credentialChanged = passwordChanged || emailChanged || phoneChanged;
    const newTokenVersion = credentialChanged ? staff.tokenVersion + 1 : staff.tokenVersion;

    const updated = User.reconstitute(input.staffId, {
      fullName: input.fullName ?? staff.fullName,
      email: normalizedEmail ? Email.create(normalizedEmail) : staff.email,
      phone: trimmedPhone ? Phone.create(trimmedPhone) : staff.phone,
      role: staff.role,
      status: staff.status,
      passwordHash: newPasswordHash,
      academyId: staff.academyId,
      tokenVersion: newTokenVersion,
      audit: updateAuditFields(staff.audit),
      softDelete: staff.softDelete,
      startDate: input.startDate !== undefined ? input.startDate : staff.startDate,
      gender: input.gender !== undefined ? input.gender : staff.gender,
      whatsappNumber:
        input.whatsappNumber !== undefined ? input.whatsappNumber : staff.whatsappNumber,
      mobileNumber: input.mobileNumber !== undefined ? input.mobileNumber : staff.mobileNumber,
      address: input.address !== undefined ? input.address : staff.address,
      qualificationInfo:
        input.qualificationInfo !== undefined ? input.qualificationInfo : staff.qualificationInfo,
      salaryConfig: input.salaryConfig !== undefined ? input.salaryConfig : staff.salaryConfig,
      profilePhotoUrl:
        input.profilePhotoUrl !== undefined ? input.profilePhotoUrl : staff.profilePhotoUrl,
    });

    // M1 fix: compute the actual diff (not just "what was in input").
    // Audit log records WHICH fields changed; if nothing changed, skip
    // both the save and the audit entry. Matches the update-student /
    // update-event / update-enquiry pattern.
    const changedFields = diffChangedStaffFields(staff, updated, passwordChanged);
    if (changedFields.length === 0) {
      return ok(toStaffResponse(staff));
    }

    try {
      await this.userRepo.save(updated);
    } catch (error) {
      // Same E11000 guard as create-staff.
      const err11000 = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (err11000?.code === 11000) {
        const keys = err11000.keyPattern ?? {};
        if ('emailNormalized' in keys || 'email' in keys) {
          return err(AuthErrors.duplicateEmail());
        }
        return err(AuthErrors.duplicatePhone());
      }
      throw error;
    }

    await this.auditRecorder.record({
      academyId: owner.academyId,
      actorUserId: input.ownerUserId,
      action: 'STAFF_UPDATED',
      entityType: 'USER',
      entityId: input.staffId,
      context: {
        staffName: updated.fullName,
        changedFields: changedFields.join(','),
      },
    });

    // H3 fix: revoke active sessions whenever a security-sensitive field
    // changes (password, email, phone). The token-version bump above
    // already invalidates JWTs on next auth check, but proactively
    // sweeping active sessions kicks the attacker out faster.
    const securitySensitiveFields = ['password', 'email', 'phoneNumber'] as const;
    const hasSecurityChange = securitySensitiveFields.some((f) => changedFields.includes(f));
    if (hasSecurityChange && this.sessionRepo) {
      await this.sessionRepo.revokeAllByUserIds([input.staffId]);
    }

    // M2 fix: notify staff when their login credentials change. Sent to
    // BOTH the previous and current email when email is the field that
    // changed (so the staff sees the notice regardless of which inbox
    // they check). Best-effort: a notification failure doesn't roll back
    // the update.
    const credentialChanges = changedFields.filter(
      (f): f is 'email' | 'phoneNumber' | 'password' =>
        f === 'email' || f === 'phoneNumber' || f === 'password',
    );
    if (credentialChanges.length > 0 && this.emailSender) {
      const academy = this.academyRepo
        ? await this.academyRepo.findById(owner.academyId).catch(() => null)
        : null;
      const academyName = academy?.academyName ?? 'Your Academy';
      const friendlyFields = credentialChanges.map((f) =>
        f === 'phoneNumber' ? 'phone' : f,
      ) as Array<'email' | 'phone' | 'password'>;
      const html = renderStaffCredentialsChangedEmail({
        staffName: updated.fullName,
        academyName,
        changedFields: friendlyFields,
        newEmail: updated.emailNormalized,
        newPhone: updated.phoneE164,
      });
      // Recipients: always the new email; also the old email if it changed.
      const recipients = new Set<string>();
      recipients.add(updated.emailNormalized);
      if (changedFields.includes('email')) {
        recipients.add(staff.emailNormalized);
      }
      for (const to of recipients) {
        this.emailSender
          .send({
            to,
            subject: `Account credentials updated - ${academyName}`,
            html,
          })
          .catch(() => {
            /* best-effort */
          });
      }
    }

    return ok(toStaffResponse(updated));
  }
}

function toStaffResponse(u: User): UpdateStaffOutput {
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

/**
 * M1 helper: returns the list of fields that differ between the original
 * staff record and the merged update. Nullable fields normalised to null
 * before comparison so undefined vs null doesn't falsely register as a
 * change. `passwordChanged` is passed in because the hash itself is
 * opaque — we know from the caller whether a new password was provided.
 */
function diffChangedStaffFields(oldS: User, newS: User, passwordChanged: boolean): string[] {
  const changed: string[] = [];
  if (oldS.fullName !== newS.fullName) changed.push('fullName');
  if (oldS.emailNormalized !== newS.emailNormalized) changed.push('email');
  if (oldS.phoneE164 !== newS.phoneE164) changed.push('phoneNumber');
  if (passwordChanged) changed.push('password');
  if ((oldS.startDate?.getTime() ?? null) !== (newS.startDate?.getTime() ?? null))
    changed.push('startDate');
  if ((oldS.gender ?? null) !== (newS.gender ?? null)) changed.push('gender');
  if ((oldS.whatsappNumber ?? null) !== (newS.whatsappNumber ?? null))
    changed.push('whatsappNumber');
  if ((oldS.mobileNumber ?? null) !== (newS.mobileNumber ?? null)) changed.push('mobileNumber');
  if ((oldS.address ?? null) !== (newS.address ?? null)) changed.push('address');
  if (
    JSON.stringify(oldS.qualificationInfo ?? null) !==
    JSON.stringify(newS.qualificationInfo ?? null)
  )
    changed.push('qualificationInfo');
  if (JSON.stringify(oldS.salaryConfig ?? null) !== JSON.stringify(newS.salaryConfig ?? null))
    changed.push('salaryConfig');
  if ((oldS.profilePhotoUrl ?? null) !== (newS.profilePhotoUrl ?? null))
    changed.push('profilePhotoUrl');
  return changed;
}
