import { useState, useCallback, useEffect, useRef } from 'react';
import { authApi } from '../../infra/auth/auth-api';

export type PasswordResetStep = 'email' | 'otp' | 'newPassword';

export function usePasswordReset() {
  const [step, setStep] = useState<PasswordResetStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      timerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownRemaining]);

  const requestOtp = useCallback(async (email: string) => {
    setError(null);
    setLoading(true);
    const result = await authApi.requestPasswordReset({ email });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCooldownRemaining(60);
    setStep('otp');
  }, []);

  const confirmReset = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      setError(null);
      setLoading(true);
      const result = await authApi.confirmPasswordReset({ email, otp, newPassword });
      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return false;
      }

      setSuccessMessage(result.value.message);
      return true;
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
    if (step === 'otp') setStep('email');
    else if (step === 'newPassword') setStep('otp');
  }, [step]);

  return {
    step,
    loading,
    error,
    cooldownRemaining,
    successMessage,
    requestOtp,
    confirmReset,
    resendOtp,
    goBack,
    setStep,
  };
}
