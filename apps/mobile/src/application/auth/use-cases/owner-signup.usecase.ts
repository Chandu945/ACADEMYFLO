import type { AuthUser } from '../../../domain/auth/auth.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { AuthApiPort, TokenStorePort, DeviceIdPort, AccessTokenPort } from '../ports';

export type SignupInput = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
};

export type SignupResult = { user: AuthUser; accessToken: string };

export type SignupDeps = {
  authApi: AuthApiPort;
  tokenStore: TokenStorePort;
  deviceId: DeviceIdPort;
  accessToken: AccessTokenPort;
};

export async function ownerSignupUseCase(
  input: SignupInput,
  deps: SignupDeps,
): Promise<Result<SignupResult, AppError>> {
  const deviceId = await deps.deviceId.getDeviceId();
  const result = await deps.authApi.ownerSignup({
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    password: input.password,
    deviceId,
  });

  if (!result.ok) return result;

  await deps.tokenStore.setSession(result.value.refreshToken, result.value.user);
  deps.accessToken.set(result.value.accessToken);

  return {
    ok: true,
    value: { user: result.value.user, accessToken: result.value.accessToken },
  };
}
