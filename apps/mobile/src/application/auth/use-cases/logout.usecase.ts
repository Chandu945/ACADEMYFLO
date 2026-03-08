import type { AuthApiPort, TokenStorePort, DeviceIdPort, AccessTokenPort } from '../ports';

export type LogoutDeps = {
  authApi: AuthApiPort;
  tokenStore: TokenStorePort;
  deviceId: DeviceIdPort;
  accessToken: AccessTokenPort;
};

export async function logoutUseCase(deps: LogoutDeps): Promise<void> {
  const token = deps.accessToken.get();
  const deviceId = await deps.deviceId.getDeviceId();

  // Best-effort backend logout; always clear local state
  if (token) {
    await deps.authApi.logout(token, deviceId).catch(() => {
      // Ignore errors — we always clear local tokens
    });
  }

  await deps.tokenStore.clearSession();
  deps.accessToken.set(null);
}
