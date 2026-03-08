import type { ChangePasswordRequest } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';

export type ChangePasswordApiPort = {
  changePassword(req: ChangePasswordRequest): Promise<Result<void, AppError>>;
};

export async function changePasswordUseCase(
  req: ChangePasswordRequest,
  deps: { parentApi: ChangePasswordApiPort },
): Promise<Result<void, AppError>> {
  return deps.parentApi.changePassword(req);
}
