import { restoreSessionUseCase } from './restore-session.usecase';
import type { RestoreSessionDeps } from './restore-session.usecase';

function makeDeps(overrides?: Partial<RestoreSessionDeps>): RestoreSessionDeps {
  return {
    authApi: {
      login: jest.fn(),
      ownerSignup: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      setupAcademy: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
    },
    tokenStore: {
      getSession: jest.fn(),
      setSession: jest.fn(),
      clearSession: jest.fn(),
    },
    deviceId: {
      getDeviceId: jest.fn().mockResolvedValue('device-123'),
    },
    accessToken: {
      set: jest.fn(),
      get: jest.fn().mockReturnValue(null),
    },
    ...overrides,
  };
}

const storedUser = {
  id: 'u1',
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '+919876543210',
  role: 'OWNER' as const,
  status: 'ACTIVE' as const,
};

describe('restoreSessionUseCase', () => {
  it('returns unauthenticated when no stored session', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue(null);

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('refreshes token and returns user on valid session', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'old-refresh',
      user: storedUser,
    });
    (deps.authApi.refresh as jest.Mock).mockResolvedValue({
      ok: true,
      value: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.id).toBe('u1');
      expect(result.value.accessToken).toBe('new-access');
    }
    expect(deps.tokenStore.setSession).toHaveBeenCalledWith('new-refresh', storedUser);
    expect(deps.accessToken.set).toHaveBeenCalledWith('new-access');
  });

  it('clears session on refresh failure', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'expired-refresh',
      user: storedUser,
    });
    (deps.authApi.refresh as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' },
    });

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(false);
    expect(deps.tokenStore.clearSession).toHaveBeenCalled();
    expect(deps.accessToken.set).not.toHaveBeenCalled();
  });

  it('passes stored refresh token and device ID to auth API', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'my-refresh',
      user: storedUser,
    });
    (deps.authApi.refresh as jest.Mock).mockResolvedValue({
      ok: true,
      value: { accessToken: 'tok', refreshToken: 'new' },
    });

    await restoreSessionUseCase(deps);

    expect(deps.authApi.refresh).toHaveBeenCalledWith('my-refresh', 'device-123');
  });
});
