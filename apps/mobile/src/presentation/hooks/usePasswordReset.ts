import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../../infra/auth/auth-api';

export type PasswordResetStep = 'email' | 'otp' | 'newPassword';

export function usePasswordReset() {
  const [step, setStep] = useState<PasswordResetStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown timer — uses setTimeout chain instead of recreating intervals
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = setTimeout(() => {
      setCooldownRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [cooldownRemaining]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await authApi.requestPasswordReset({ email });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setError(result.error.message);
        return;
      }

      setCooldownRemaining(60);
      setStep('otp');
    } catch {
      if (__DEV__) console.error('[usePasswordReset] requestOtp failed');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmReset = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<boolean> => {
      setError(null);
      setFieldErrors({});
      setLoading(true);
      try {
        const result = await authApi.confirmPasswordReset({ email, otp, newPassword });

        if (!result.ok) {
          if (result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors);
          }
          setError(result.error.message);

          // If the error is OTP-related, route back to OTP step.
          // Use field error key (stable) rather than message string matching (brittle).
          if (result.error.fieldErrors?.['otp'] || result.error.code === 'FORBIDDEN') {
            setStep('otp');
          }

          return false;
        }

        setSuccessMessage(result.value.message);
        return true;
      } catch {
        if (__DEV__) console.error('[usePasswordReset] confirmReset failed');
        setError('Something went wrong. Please try again.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const resendOtp = useCallback(
    async (email: string) => {
      if (cooldownRemaining > 0) return;
      await requestOtp(email);
    },
    [cooldownRemaining, requestOtp],
  );

  const goBack = useCallback(() => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    if (step === 'otp') setStep('email');
    else if (step === 'newPassword') setStep('otp');
  }, [step]);

  const reset = useCallback(() => {
    setStep('email');
    setLoading(false);
    setError(null);
    setFieldErrors({});
    setCooldownRemaining(0);
    setSuccessMessage(null);
  }, []);

  return {
    step,
    loading,
    error,
    fieldErrors,
    cooldownRemaining,
    successMessage,
    requestOtp,
    confirmReset,
    resendOtp,
    goBack,
    setStep,
    clearError,
    clearFieldError,
    reset,
  };
}
