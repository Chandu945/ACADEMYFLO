import * as Keychain from 'react-native-keychain';
import type { AuthUser } from '../../domain/auth/auth.types';

const SERVICE_KEY = 'com.academyflo.session';

type StoredSession = {
  refreshToken: string;
  user: AuthUser;
};

export const tokenStore = {
  async getSession(): Promise<StoredSession | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: SERVICE_KEY });
      if (!credentials) return null;
      const parsed = JSON.parse(credentials.password);
      if (!parsed?.refreshToken || !parsed?.user?.id) return null;
      return parsed as StoredSession;
    } catch (error) {
      if (__DEV__) console.warn('[TokenStore] Keychain read failed:', error instanceof Error ? error.message : 'unknown');
      return null;
    }
  },

  async setSession(refreshToken: string, user: AuthUser): Promise<void> {
    try {
      const payload: StoredSession = { refreshToken, user };
      await Keychain.setGenericPassword('session', JSON.stringify(payload), {
        service: SERVICE_KEY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      if (__DEV__) console.warn('[TokenStore] Keychain write failed:', error instanceof Error ? error.message : 'unknown');
      throw new Error('Failed to save session to secure storage');
    }
  },

  async clearSession(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_KEY });
    } catch (error) {
      if (__DEV__) console.warn('[TokenStore] Keychain clear failed:', error instanceof Error ? error.message : 'unknown');
    }
  },
};
