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

  // Validate the OTP with the server before advancing to the password step.
  // Returns true on success so the caller can decide whether to advance.
  const verifyOtp = useCallback(
    async (email: string, otp: string): Promise<boolean> => {
      setError(null);
      setFieldErrors({});
      setLoading(true);
      try {
        const result = await authApi.verifyPasswordReset({ email, otp });

        if (!result.ok) {
          // Surface OTP-specific errors next to the OTP input so the user
          // sees the inline error instead of just the top banner.
          if (result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors);
          } else if (
            result.error.code === 'UNAUTHORIZED' ||
            result.error.code === 'FORBIDDEN'
          ) {
            setFieldErrors({ otp: result.error.message });
          }
          setError(result.error.message);
          return false;
        }

        setStep('newPassword');
        return true;
      } catch {
        if (__DEV__) console.error('[usePasswordReset] verifyOtp failed');
        setError('Something went wrong. Please try again.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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

          // If the error is OTP-related, route back to the OTP step. We
          // check three signals because the API uses different codes for
          // different OTP failure modes: UNAUTHORIZED for invalid/expired
          // OTP (the common case, e.g. when verify-freshness expired
          // between step 2 and step 3), FORBIDDEN for the per-email
          // lockout, and fieldErrors.otp for DTO-level validation rejects.
          if (
            result.error.fieldErrors?.['otp'] ||
            result.error.code === 'UNAUTHORIZED' ||
            result.error.code === 'FORBIDDEN'
          ) {
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
    verifyOtp,
    confirmReset,
    resendOtp,
    goBack,
    setStep,
    clearError,
    clearFieldError,
    reset,
  };
}
