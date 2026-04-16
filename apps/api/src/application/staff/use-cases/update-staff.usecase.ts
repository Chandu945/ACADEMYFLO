import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import { canManageStaff, staffBelongsToAcademy } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import { Email } from '@domain/identity/value-objects/email.vo';
import { Phone } from '@domain/identity/value-objects/phone.vo';
import type { UserRole } from '@playconnect/contracts';
import type { StaffQualificationInfo, StaffSalaryConfig } from '@domain/identity/entities/user.entity';

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

export class UpdateStaffUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
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

    // Check uniqueness for changed email
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== staff.emailNormalized) {
        const existing = await this.userRepo.findByEmail(normalizedEmail);
        if (existing) {
          return err(AuthErrors.duplicateEmail());
        }
      }
    }

    // Check uniqueness for changed phone
    if (input.phoneNumber) {
      const trimmedPhone = input.phoneNumber.trim();
      if (trimmedPhone !== staff.phoneE164) {
        const existing = await this.userRepo.findByPhone(trimmedPhone);
        if (existing) {
          return err(AuthErrors.duplicatePhone());
        }
      }
    }

    const newPasswordHash = input.password
      ? await this.passwordHasher.hash(input.password)
      : staff.passwordHash;

    const updated = User.reconstitute(input.staffId, {
      fullName: input.fullName ?? staff.fullName,
      email: input.email ? Email.create(input.email) : staff.email,
      phone: input.phoneNumber ? Phone.create(input.phoneNumber) : staff.phone,
      role: staff.role,
      status: staff.status,
      passwordHash: newPasswordHash,
      academyId: staff.academyId,
      tokenVersion: staff.tokenVersion,
      audit: updateAuditFields(staff.audit),
      softDelete: staff.softDelete,
      startDate: input.startDate !== undefined ? input.startDate : staff.startDate,
      gender: input.gender !== undefined ? input.gender : staff.gender,
      whatsappNumber: input.whatsappNumber !== undefined ? input.whatsappNumber : staff.whatsappNumber,
      mobileNumber: input.mobileNumber !== undefined ? input.mobileNumber : staff.mobileNumber,
      address: input.address !== undefined ? input.address : staff.address,
      qualificationInfo: input.qualificationInfo !== undefined ? input.qualificationInfo : staff.qualificationInfo,
      salaryConfig: input.salaryConfig !== undefined ? input.salaryConfig : staff.salaryConfig,
      profilePhotoUrl: input.profilePhotoUrl !== undefined ? input.profilePhotoUrl : staff.profilePhotoUrl,
    });

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
