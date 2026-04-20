import type { AuthApiPort, TokenStorePort, DeviceIdPort, AccessTokenPort } from '../ports';
import type { PushTokenApiPort, PushTokenProviderPort } from '../../notification/ports';

export type LogoutDeps = {
  authApi: AuthApiPort;
  tokenStore: TokenStorePort;
  deviceId: DeviceIdPort;
  accessToken: AccessTokenPort;
  pushTokenApi: PushTokenApiPort;
  pushTokenProvider: PushTokenProviderPort;
};

export async function logoutUseCase(deps: LogoutDeps): Promise<void> {
  const token = deps.accessToken.get();
  const deviceId = await deps.deviceId.getDeviceId();

  // Best-effort unregister push token before clearing session. Log failures
  // so a user stuck in a "keeps getting notifications after logout" loop is
  // diagnosable from device logs — they were previously silent.
  try {
    const fcmToken = await deps.pushTokenProvider.getCurrentToken();
    if (fcmToken) {
      const result = await deps.pushTokenApi.unregisterToken(fcmToken);
      if (!result.ok && __DEV__) {
        console.warn('[logout] push token unregister failed:', result.error.code, result.error.message);
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[logout] push token unregister threw:', e);
  }

  // Best-effort backend logout; always clear local state
  if (token) {
    await deps.authApi.logout(token, deviceId).catch(() => {
      // Ignore errors — we always clear local tokens
    });
  }

  await deps.tokenStore.clearSession();
  deps.accessToken.set(null);
}
