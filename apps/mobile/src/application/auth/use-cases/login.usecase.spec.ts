import { loginUseCase } from './login.usecase';
import type { LoginDeps } from './login.usecase';
import type { AuthResponse } from '../../../domain/auth/auth.types';

function makeDeps(overrides?: Partial<LoginDeps>): LoginDeps {
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

const mockAuthResponse: AuthResponse = {
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  deviceId: 'device-123',
  user: {
    id: 'u1',
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    status: 'ACTIVE',
  },
};

describe('loginUseCase', () => {
  it('stores refresh token and sets access token on success', async () => {
    const deps = makeDeps();
    (deps.authApi.login as jest.Mock).mockResolvedValue({ ok: true, value: mockAuthResponse });

    const result = await loginUseCase('test@example.com', 'Password1!', deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.id).toBe('u1');
      expect(result.value.accessToken).toBe('access-tok');
    }
    expect(deps.tokenStore.setSession).toHaveBeenCalledWith('refresh-tok', mockAuthResponse.user);
    expect(deps.accessToken.set).toHaveBeenCalledWith('access-tok');
    expect(deps.deviceId.getDeviceId).toHaveBeenCalled();
  });

  it('returns error and does not store tokens on failure', async () => {
    const deps = makeDeps();
    (deps.authApi.login as jest.Mock).mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    });

    const result = await loginUseCase('bad@example.com', 'wrong', deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
    expect(deps.tokenStore.setSession).not.toHaveBeenCalled();
    expect(deps.accessToken.set).not.toHaveBeenCalled();
  });

  it('passes deviceId to auth API', async () => {
    const deps = makeDeps();
    (deps.authApi.login as jest.Mock).mockResolvedValue({ ok: true, value: mockAuthResponse });

    await loginUseCase('test@example.com', 'Password1!', deps);

    expect(deps.authApi.login).toHaveBeenCalledWith({
      identifier: 'test@example.com',
      password: 'Password1!',
      deviceId: 'device-123',
    });
  });
});
