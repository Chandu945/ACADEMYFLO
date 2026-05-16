import type { UserProfile, UpdateUserProfileRequest } from '../../../domain/profile/profile.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';

export type UpdateProfileApiPort = {
  updateMyProfile(req: UpdateUserProfileRequest): Promise<Result<UserProfile, AppError>>;
};

export type UpdateProfileDeps = {
  profileApi: UpdateProfileApiPort;
};

export async function updateProfileUseCase(
  req: UpdateUserProfileRequest,
  deps: UpdateProfileDeps,
): Promise<Result<UserProfile, AppError>> {
  return deps.profileApi.updateMyProfile(req);
}
