import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { UpdateStaffInput } from '../../../domain/staff/staff.types';

export type UpdateStaffApiPort = {
  updateStaff(staffId: string, input: UpdateStaffInput): Promise<Result<unknown, AppError>>;
};

export type UpdateStaffDeps = {
  staffApi: UpdateStaffApiPort;
};

export async function updateStaffUseCase(
  deps: UpdateStaffDeps,
  staffId: string,
  input: UpdateStaffInput,
): Promise<Result<unknown, AppError>> {
  return deps.staffApi.updateStaff(staffId, input);
}
