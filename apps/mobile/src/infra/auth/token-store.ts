import * as Keychain from 'react-native-keychain';
import type { AuthUser } from '../../domain/auth/auth.types';

const SERVICE_KEY = 'com.playconnect.session';

type StoredSession = {
  refreshToken: string;
  user: AuthUser;
};

export const tokenStore = {
  async getSession(): Promise<StoredSession | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: SERVICE_KEY });
      if (!credentials) return null;
      return JSON.parse(credentials.password) as StoredSession;
    } catch (error) {
      console.warn('[TokenStore] Keychain read failed:', error instanceof Error ? error.message : 'unknown');
      return null;
    }
  },

  async setSession(refreshToken: string, user: AuthUser): Promise<void> {
    try {
      const payload: StoredSession = { refreshToken, user };
      await Keychain.setGenericPassword('session', JSON.stringify(payload), {
        service: SERVICE_KEY,
      });
    } catch (error) {
      console.warn('[TokenStore] Keychain write failed:', error instanceof Error ? error.message : 'unknown');
    }
  },

  async clearSession(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_KEY });
    } catch (error) {
      console.warn('[TokenStore] Keychain clear failed:', error instanceof Error ? error.message : 'unknown');
    }
  },
};
