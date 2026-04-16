import { restoreSessionUseCase } from './restore-session.usecase';
import type { RestoreSessionDeps } from './restore-session.usecase';

const mockTryRefresh = jest.fn();

function makeDeps(overrides?: Partial<RestoreSessionDeps>): RestoreSessionDeps {
  return {
    tokenStore: {
      getSession: jest.fn(),
      setSession: jest.fn(),
      clearSession: jest.fn(),
    },
    accessToken: {
      set: jest.fn(),
      get: jest.fn().mockReturnValue(null),
    },
    tokenRefresher: {
      tryRefresh: mockTryRefresh,
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unauthenticated when no stored session', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue(null);

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
    expect(mockTryRefresh).not.toHaveBeenCalled();
  });

  it('refreshes token via shared tryRefresh and returns user on valid session', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'old-refresh',
      user: storedUser,
    });
    mockTryRefresh.mockResolvedValue('new-access');

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.id).toBe('u1');
      expect(result.value.accessToken).toBe('new-access');
    }
    expect(mockTryRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears session on refresh failure', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'expired-refresh',
      user: storedUser,
    });
    mockTryRefresh.mockResolvedValue(null);

    const result = await restoreSessionUseCase(deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
    expect(deps.tokenStore.clearSession).toHaveBeenCalled();
  });

  it('delegates to shared tryRefresh for deduplication', async () => {
    const deps = makeDeps();
    (deps.tokenStore.getSession as jest.Mock).mockResolvedValue({
      refreshToken: 'my-refresh',
      user: storedUser,
    });
    mockTryRefresh.mockResolvedValue('tok');

    await restoreSessionUseCase(deps);

    // Verify it uses the shared mechanism, not a direct API call
    expect(mockTryRefresh).toHaveBeenCalledTimes(1);
  });
});
