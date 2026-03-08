import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { StaffStatus } from '../../../domain/staff/staff.types';

export type SetStaffStatusApiPort = {
  setStaffStatus(
    staffId: string,
    input: { status: StaffStatus },
  ): Promise<Result<unknown, AppError>>;
};

export type SetStaffStatusDeps = {
  staffApi: SetStaffStatusApiPort;
};

export async function setStaffStatusUseCase(
  deps: SetStaffStatusDeps,
  staffId: string,
  status: StaffStatus,
): Promise<Result<unknown, AppError>> {
  return deps.staffApi.setStaffStatus(staffId, { status });
}
