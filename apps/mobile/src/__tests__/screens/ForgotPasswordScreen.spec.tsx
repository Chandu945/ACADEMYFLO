import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// Mock auth API
jest.mock('../../infra/auth/auth-api', () => ({
  authApi: {
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
  },
}));

import { authApi } from '../../infra/auth/auth-api';
import { ForgotPasswordScreen } from '../../presentation/screens/auth/ForgotPasswordScreen';

const mockRequestPasswordReset = authApi.requestPasswordReset as jest.Mock;
const mockConfirmPasswordReset = authApi.confirmPasswordReset as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ForgotPasswordScreen', () => {
  it('renders email step initially', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByText('Forgot Password')).toBeTruthy();
    expect(screen.getByTestId('forgot-email')).toBeTruthy();
    expect(screen.getByTestId('forgot-send')).toBeTruthy();
    expect(screen.getByTestId('forgot-back')).toBeTruthy();
  });

  it('shows validation error for empty email', async () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-send'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows OTP step after successful request', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'If an account exists, a reset code has been sent.' },
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'test@example.com');
    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('forgot-send'));
    });

    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeTruthy();
    });

    expect(screen.getByTestId('forgot-otp')).toBeTruthy();
    expect(screen.getByTestId('forgot-verify')).toBeTruthy();
  });

  it('shows inline error on API failure', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK', message: 'Network error. Please check your connection.' },
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'test@example.com');
    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('forgot-send'));
    });

    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeTruthy();
    });
  });

  it('back button navigates to Login from email step', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-back'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('validates OTP format', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'sent' },
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'test@example.com');
    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('forgot-send'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('forgot-otp')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('forgot-verify'));
    expect(await screen.findByText('Verification code is required')).toBeTruthy();
  });

  it('navigates to Login on successful password reset', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'sent' },
    });
    mockConfirmPasswordReset.mockResolvedValue({
      ok: true,
      value: { message: 'Password reset successful.' },
    });

    render(<ForgotPasswordScreen />);

    // Email step
    fireEvent.changeText(screen.getByTestId('forgot-email'), 'test@example.com');
    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('forgot-send'));
    });

    // OTP step
    await waitFor(() => {
      expect(screen.getByTestId('forgot-otp')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('forgot-otp'), '123456');
    fireEvent.press(screen.getByTestId('forgot-verify'));

    // New password step
    await waitFor(() => {
      expect(screen.getByTestId('forgot-new-password')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('forgot-new-password'), 'NewPassword1!');
    fireEvent.changeText(screen.getByTestId('forgot-confirm-password'), 'NewPassword1!');

    await waitFor(async () => {
      fireEvent.press(screen.getByTestId('forgot-reset'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });
});
