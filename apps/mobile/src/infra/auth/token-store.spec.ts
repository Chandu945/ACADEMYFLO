import * as Keychain from 'react-native-keychain';
import { tokenStore } from './token-store';
import type { AuthUser } from '../../domain/auth/auth.types';

const mockUser: AuthUser = {
  id: 'u1',
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '+919876543210',
  role: 'OWNER',
  status: 'ACTIVE',
};

describe('tokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setSession stores serialized JSON via keychain', async () => {
    await tokenStore.setSession('refresh-tok', mockUser);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'session',
      JSON.stringify({ refreshToken: 'refresh-tok', user: mockUser }),
      { service: 'com.playconnect.session' },
    );
  });

  it('getSession returns parsed session when credentials exist', async () => {
    const stored = JSON.stringify({ refreshToken: 'refresh-tok', user: mockUser });
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'session',
      password: stored,
    });

    const session = await tokenStore.getSession();

    expect(session).toEqual({ refreshToken: 'refresh-tok', user: mockUser });
  });

  it('getSession returns null when no credentials', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const session = await tokenStore.getSession();

    expect(session).toBeNull();
  });

  it('getSession returns null on parse error', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'session',
      password: 'invalid json',
    });

    const session = await tokenStore.getSession();

    expect(session).toBeNull();
  });

  it('clearSession resets keychain', async () => {
    await tokenStore.clearSession();

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'com.playconnect.session',
    });
  });
});
