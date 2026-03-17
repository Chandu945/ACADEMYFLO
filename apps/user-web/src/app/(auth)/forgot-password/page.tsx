'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

type Step = 'request' | 'confirm' | 'done';

const STEPS = [
  { key: 'request', label: 'Email' },
  { key: 'confirm', label: 'Verify & Reset' },
] as const;

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = current === 'request' ? 0 : 1;

  return (
    <div className={styles.stepRow}>
      {STEPS.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div
                className={`${styles.stepLine} ${isDone || isActive ? styles.stepLineDone : ''}`}
              />
            )}
            <div className={styles.stepItem}>
              <div
                className={`${styles.stepDot} ${isDone ? styles.stepDotDone : ''} ${isActive ? styles.stepDotActive : ''}`}
              >
                {isDone ? (
                  <svg className={styles.stepCheckIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    className={`${styles.stepDotText} ${isActive ? styles.stepDotTextActive : ''}`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className={`${styles.stepLabel} ${isDone || isActive ? styles.stepLabelActive : ''}`}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const stepConfig = {
    request: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
      title: 'Forgot Password?',
      subtitle: "No worries. Enter your email and we'll send you a reset code.",
    },
    confirm: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      ),
      title: 'Reset Password',
      subtitle: `Enter the code sent to ${identifier} and choose a new password.`,
    },
    done: {
      icon: null,
      title: '',
      subtitle: '',
    },
  };

  const config = stepConfig[step];

  const validateRequest = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!identifier.trim()) errors['identifier'] = 'Email or phone is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [identifier]);

  const validateConfirm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!otp.trim()) errors['otp'] = 'Verification code is required';
    else if (!/^\d{4,6}$/.test(otp.trim())) errors['otp'] = 'Code must be 4-6 digits';
    if (!newPassword) errors['newPassword'] = 'New password is required';
    else if (newPassword.length < 8) errors['newPassword'] = 'Password must be at least 8 characters';
    if (!confirmPassword) errors['confirmPassword'] = 'Please confirm your password';
    else if (newPassword !== confirmPassword) errors['confirmPassword'] = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [otp, newPassword, confirmPassword]);

  const handleRequestOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);
      if (!validateRequest()) return;

      setLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'request',
            identifier: identifier.trim().toLowerCase(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message ?? 'Failed to send reset code.');
          return;
        }

        setSuccessMessage('Reset code sent! Check your email.');
        setCooldown(60);
        setStep('confirm');
        setFieldErrors({});
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [identifier, validateRequest],
  );

  const handleConfirmReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);
      if (!validateConfirm()) return;

      setLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            identifier: identifier.trim().toLowerCase(),
            otp: otp.trim(),
            newPassword,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message ?? 'Failed to reset password.');
          return;
        }

        setStep('done');
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [identifier, otp, newPassword, validateConfirm],
  );

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          identifier: identifier.trim().toLowerCase(),
        }),
      });

      if (res.ok) {
        setSuccessMessage('Reset code resent!');
        setCooldown(60);
      } else {
        const data = await res.json();
        setError(data.message ?? 'Failed to resend code.');
      }
    } catch {
      setError('Something went wrong.');
    }
  }, [identifier, cooldown]);

  // Success state
  if (step === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.wrapper}>
          <div className={styles.successCard}>
            <div className={styles.successIconBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Password Reset!</h2>
            <p className={styles.successSubtitle}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Link href="/login" className={styles.successLoginLink}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.iconBadge}>{config.icon}</div>
          <h1 className={styles.title}>{config.title}</h1>
          <p className={styles.subtitle}>{config.subtitle}</p>
        </div>

        {/* Form Card */}
        <div className={styles.card}>
          <StepIndicator current={step} />

          {error && (
            <div className={styles.errorBanner} role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={styles.errorText}>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className={styles.successBanner} role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className={styles.successText}>{successMessage}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className={styles.form} noValidate>
              <Input
                label="Email or Phone"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={fieldErrors['identifier']}
                placeholder="Enter your email or phone"
                autoComplete="email"
                maxLength={100}
                required
              />

              <div className={styles.submitButton}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Send Reset Code
                </Button>
              </div>
            </form>
          )}

          {step === 'confirm' && (
            <form onSubmit={handleConfirmReset} className={styles.form} noValidate>
              <Input
                label="Verification Code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={fieldErrors['otp']}
                placeholder="Enter 6-digit code"
                autoComplete="one-time-code"
                maxLength={6}
                inputMode="numeric"
                required
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={fieldErrors['newPassword']}
                placeholder="Enter new password"
                autoComplete="new-password"
                maxLength={64}
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors['confirmPassword']}
                placeholder="Confirm new password"
                autoComplete="new-password"
                maxLength={64}
                required
              />

              <div className={styles.submitButton}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Reset Password
                </Button>
              </div>

              <div className={styles.resendRow}>
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={handleResend}
                  disabled={cooldown > 0}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer / Back */}
        <div className={styles.footer}>
          {step === 'request' ? (
            <Link href="/login" className={styles.backLink}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Sign In
            </Link>
          ) : (
            <button
              type="button"
              className={styles.backLink}
              onClick={() => {
                setStep('request');
                setError(null);
                setSuccessMessage(null);
                setFieldErrors({});
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
