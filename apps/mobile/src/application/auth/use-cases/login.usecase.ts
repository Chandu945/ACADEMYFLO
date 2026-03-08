import type { AuthUser } from '../../../domain/auth/auth.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { AuthApiPort, TokenStorePort, DeviceIdPort, AccessTokenPort } from '../ports';

export type LoginResult = { user: AuthUser; accessToken: string };

export type LoginDeps = {
  authApi: AuthApiPort;
  tokenStore: TokenStorePort;
  deviceId: DeviceIdPort;
  accessToken: AccessTokenPort;
};

export async function loginUseCase(
  identifier: string,
  password: string,
  deps: LoginDeps,
): Promise<Result<LoginResult, AppError>> {
  const deviceId = await deps.deviceId.getDeviceId();
  const result = await deps.authApi.login({ identifier, password, deviceId });

  if (!result.ok) return result;

  await deps.tokenStore.setSession(result.value.refreshToken, result.value.user);
  deps.accessToken.set(result.value.accessToken);

  return {
    ok: true,
    value: { user: result.value.user, accessToken: result.value.accessToken },
  };
}
