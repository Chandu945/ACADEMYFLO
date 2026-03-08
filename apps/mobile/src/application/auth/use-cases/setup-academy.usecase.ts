import type { AcademySetupRequest, AcademySetupResponse } from '../../../domain/auth/auth.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { AuthApiPort, AccessTokenPort } from '../ports';

export type SetupAcademyDeps = {
  authApi: AuthApiPort;
  accessToken: AccessTokenPort;
};

export async function setupAcademyUseCase(
  input: AcademySetupRequest,
  deps: SetupAcademyDeps,
): Promise<Result<AcademySetupResponse, AppError>> {
  const token = deps.accessToken.get();
  if (!token) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'No access token' } };
  }

  return deps.authApi.setupAcademy(input, token);
}
