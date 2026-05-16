import type { UserProfile } from '../../../domain/profile/profile.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';

export type GetProfileApiPort = {
  getMyProfile(): Promise<Result<UserProfile, AppError>>;
};

export type GetProfileDeps = {
  profileApi: GetProfileApiPort;
};

export async function getProfileUseCase(
  deps: GetProfileDeps,
): Promise<Result<UserProfile, AppError>> {
  return deps.profileApi.getMyProfile();
}
