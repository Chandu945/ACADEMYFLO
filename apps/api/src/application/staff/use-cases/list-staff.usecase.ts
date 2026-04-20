import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canManageStaff } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { StaffQualificationInfo, StaffSalaryConfig } from '@domain/identity/entities/user.entity';

export interface ListStaffInput {
  ownerUserId: string;
  ownerRole: UserRole;
  page: number;
  pageSize: number;
  /** Optional filter — when set, exclude users not matching this status. */
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface StaffListItem {
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

export interface ListStaffOutput {
  data: StaffListItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ListStaffUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: ListStaffInput): Promise<Result<ListStaffOutput, AppError>> {
    const check = canManageStaff(input.ownerRole);
    if (!check.allowed) {
      return err(AuthErrors.notOwner());
    }

    const owner = await this.userRepo.findById(input.ownerUserId);
    if (!owner || !owner.academyId) {
      return err(StaffErrors.academyRequired());
    }

    const { users, total } = await this.userRepo.listByAcademyAndRole(
      owner.academyId,
      'STAFF',
      input.page,
      input.pageSize,
    );

    // In-memory status filter: the repository's listByAcademyAndRole returns
    // both ACTIVE and INACTIVE staff, and we don't want to add a new repo
    // method just for this. Page-local filter is acceptable since `total`
    // still reflects the full set; UI can decide whether to keep paginating.
    const filteredUsers =
      input.status === undefined ? users : users.filter((u) => u.status === input.status);

    const data: StaffListItem[] = filteredUsers.map((u) => ({
      id: u.id.toString(),
      fullName: u.fullName,
      email: u.emailNormalized,
      phoneNumber: u.phoneE164,
      role: u.role,
      status: u.status,
      academyId: u.academyId,
      startDate: u.startDate,
      gender: u.gender,
      whatsappNumber: u.whatsappNumber,
      mobileNumber: u.mobileNumber,
      address: u.address,
      qualificationInfo: u.qualificationInfo,
      salaryConfig: u.salaryConfig,
      profilePhotoUrl: u.profilePhotoUrl,
      createdAt: u.audit.createdAt,
      updatedAt: u.audit.updatedAt,
    }));

    return ok({
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    });
  }
}
