import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canManageStaff, staffBelongsToAcademy } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { StaffQualificationInfo, StaffSalaryConfig } from '@domain/identity/entities/user.entity';

export interface GetStaffInput {
  ownerUserId: string;
  ownerRole: UserRole;
  staffId: string;
}

export interface GetStaffOutput {
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

export class GetStaffUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: GetStaffInput): Promise<Result<GetStaffOutput, AppError>> {
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

    return ok({
      id: staff.id.toString(),
      fullName: staff.fullName,
      email: staff.emailNormalized,
      phoneNumber: staff.phoneE164,
      role: staff.role,
      status: staff.status,
      academyId: staff.academyId,
      startDate: staff.startDate,
      gender: staff.gender,
      whatsappNumber: staff.whatsappNumber,
      mobileNumber: staff.mobileNumber,
      address: staff.address,
      qualificationInfo: staff.qualificationInfo,
      salaryConfig: staff.salaryConfig,
      profilePhotoUrl: staff.profilePhotoUrl,
      createdAt: staff.audit.createdAt,
      updatedAt: staff.audit.updatedAt,
    });
  }
}
