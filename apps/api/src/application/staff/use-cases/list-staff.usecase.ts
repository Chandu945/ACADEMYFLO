import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canManageStaff } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type {
  StaffQualificationInfo,
  StaffSalaryConfig,
} from '@domain/identity/entities/user.entity';

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
  // ISO 8601 wire format — JSON.stringify always emits these as strings and
  // mobile zod parses them as strings. Construction site below converts at
  // the boundary so the use-case output type matches the actual wire shape.
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

    // M4 fix: push the status filter into the repo so `total` reflects the
    // filtered set. Prior code filtered the current page in memory, which
    // left `total = full count` while `data.length = filtered subset` —
    // pagination UI showed misleading page counts and would render empty
    // pages mid-walk.
    const { users, total } = await this.userRepo.listByAcademyAndRole(
      owner.academyId,
      'STAFF',
      input.page,
      input.pageSize,
      input.status,
    );

    const data: StaffListItem[] = users.map((u) => ({
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
