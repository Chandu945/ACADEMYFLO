import { renderHook, act } from '@testing-library/react-native';
import { usePasswordReset } from '../../presentation/hooks/usePasswordReset';

// Mock the auth-api module
jest.mock('../../infra/auth/auth-api', () => ({
  authApi: {
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
      googleLogin: jest.fn(),
  },
}));

import { authApi } from '../../infra/auth/auth-api';

const mockRequestPasswordReset = authApi.requestPasswordReset as jest.Mock;
const mockConfirmPasswordReset = authApi.confirmPasswordReset as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePasswordReset', () => {
  it('should start at email step with loading=false', () => {
    const { result } = renderHook(() => usePasswordReset());
    expect(result.current.step).toBe('email');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.cooldownRemaining).toBe(0);
  });

  it('should transition to otp step on successful requestOtp', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'If an account exists, a reset code has been sent.' },
    });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () => {
      await result.current.requestOtp('test@example.com');
    });

    expect(result.current.step).toBe('otp');
    expect(result.current.cooldownRemaining).toBe(60);
    expect(result.current.error).toBeNull();
  });

  it('should set error on failed requestOtp', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK', message: 'Network error' },
    });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () => {
      await result.current.requestOtp('test@example.com');
    });

    expect(result.current.step).toBe('email');
    expect(result.current.error).toBe('Network error');
  });

  it('should return true on successful confirmReset', async () => {
    mockConfirmPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'Password reset successful.' },
    });

    const { result } = renderHook(() => usePasswordReset());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.confirmReset('test@example.com', '123456', 'NewPass1!');
    });

    expect(success).toBe(true);
    expect(result.current.successMessage).toBe('Password reset successful.');
  });

  it('should set error on failed confirmReset', async () => {
    mockConfirmPasswordReset.mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired verification code' },
    });

    const { result } = renderHook(() => usePasswordReset());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.confirmReset('test@example.com', '000000', 'NewPass1!');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Invalid or expired verification code');
  });

  it('should decrement cooldown timer', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'sent' },
    });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () => {
      await result.current.requestOtp('test@example.com');
    });

    expect(result.current.cooldownRemaining).toBe(60);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.cooldownRemaining).toBeGreaterThanOrEqual(55);
    expect(result.current.cooldownRemaining).toBeLessThanOrEqual(57);
  });

  it('goBack should move from otp to email', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'sent' },
    });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () => {
      await result.current.requestOtp('test@example.com');
    });

    expect(result.current.step).toBe('otp');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.step).toBe('email');
  });

  it('resendOtp should not call API during cooldown', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'sent' },
    });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () => {
      await result.current.requestOtp('test@example.com');
    });

    mockRequestPasswordReset.mockClear();

    await act(async () => {
      await result.current.resendOtp('test@example.com');
    });

    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });
});
