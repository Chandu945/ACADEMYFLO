import type { AuthApiPort, TokenStorePort, DeviceIdPort, AccessTokenPort } from '../ports';
import type { PushTokenApiPort } from '../../notification/ports';
import { getFcmToken } from '../../../infra/notification/firebase-messaging';

export type LogoutDeps = {
  authApi: AuthApiPort;
  tokenStore: TokenStorePort;
  deviceId: DeviceIdPort;
  accessToken: AccessTokenPort;
  pushTokenApi: PushTokenApiPort;
};

export async function logoutUseCase(deps: LogoutDeps): Promise<void> {
  const token = deps.accessToken.get();
  const deviceId = await deps.deviceId.getDeviceId();

  // Best-effort unregister push token before clearing session
  try {
    const fcmToken = await getFcmToken();
    if (fcmToken) {
      await deps.pushTokenApi.unregisterToken(fcmToken);
    }
  } catch {
    // Best effort — don't block logout if push token unregister fails
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
