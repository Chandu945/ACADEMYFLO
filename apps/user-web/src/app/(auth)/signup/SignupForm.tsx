'use client';

import React, { useState, useCallback, useRef, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { resetInitAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

/** Prepend +91 country code to the raw digit input */
function normalisePhone(raw: string): string {
  const digits = raw.trim().replace(/\D/g, '');
  return `+91${digits}`;
}

function validateFieldValue(
  field: string,
  values: { fullName: string; email: string; phoneNumber: string; password: string },
): string | null {
  switch (field) {
    case 'fullName':
      if (!values.fullName.trim()) return 'Full name is required';
      return null;
    case 'email':
      if (!values.email.trim()) return 'Email is required';
      if (!EMAIL_REGEX.test(values.email.trim())) return 'Invalid email format';
      return null;
    case 'phoneNumber': {
      const digits = values.phoneNumber.trim().replace(/\D/g, '');
      if (!digits) return 'Phone number is required';
      if (digits.length !== 10) return 'Enter a valid 10-digit mobile number';
      return null;
    }
    case 'password':
      if (!values.password) return 'Password is required';
      if (values.password.length < 8) return 'Password must be at least 8 characters';
      if (!STRONG_PASSWORD_REGEX.test(values.password))
        return 'Must include uppercase, lowercase, number, and special character';
      return null;
    default:
      return null;
  }
}

function safeFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}

export default function SignupForm() {
  const router = useRouter();
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const phoneId = useId();
  const phoneErrorId = `${phoneId}-error`;
  const phoneHintId = `${phoneId}-hint`;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tosAccepted, setTosAccepted] = useState(false);

  const validate = useCallback((): boolean => {
    const values = { fullName, email, phoneNumber, password };
    const errors: Record<string, string> = {};
    for (const field of ['fullName', 'email', 'phoneNumber', 'password'] as const) {
      const msg = validateFieldValue(field, values);
      if (msg) errors[field] = msg;
    }
    if (!tosAccepted) {
      errors['tos'] = 'You must accept the Terms of Service and Privacy Policy';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, phoneNumber, password, tosAccepted]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleBlur = useCallback(
    (field: string) => {
      const values = { fullName, email, phoneNumber, password };
      const msg = validateFieldValue(field, values);
      if (msg) {
        setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      }
    },
    [fullName, email, phoneNumber, password],
  );

  const showError = useCallback((msg: string) => {
    setError(msg);
    // Defer focus so the error banner renders first
    setTimeout(() => errorBannerRef.current?.focus(), 0);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setFieldErrors({});
      if (!validate()) return;

      setLoading(true);
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: normalisePhone(phoneNumber),
            password,
          }),
          signal: AbortSignal.timeout(15000),
        });

        let data: Record<string, unknown>;
        try {
          data = await res.json();
        } catch {
          showError('Server returned an unexpected response. Please try again.');
          return;
        }

        if (!res.ok) {
          const serverFieldErrors = safeFieldErrors(data['fieldErrors']);
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
          }
          showError((typeof data['message'] === 'string' ? data['message'] : null) ?? 'Signup failed. Please try again.');
          return;
        }

        resetInitAuth();
        router.push('/dashboard');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'TimeoutError') {
          showError('Request timed out. Please check your connection and try again.');
        } else {
          showError('Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [fullName, email, phoneNumber, password, validate, router, showError],
  );

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.iconBadge}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 id="signup-heading" className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Set up your academy in minutes</p>
        </div>

        {/* Form Card */}
        <div className={styles.card}>
          {error && (
            <div
              ref={errorBannerRef}
              className={styles.errorBanner}
              role="alert"
              tabIndex={-1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={styles.errorText}>{error}</span>
              <button
                type="button"
                className={styles.errorDismiss}
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={styles.form}
            noValidate
            aria-labelledby="signup-heading"
          >
            <fieldset disabled={loading} className={styles.fieldset}>
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError('fullName');
                }}
                onBlur={() => handleBlur('fullName')}
                error={fieldErrors['fullName']}
                placeholder="Enter your full name"
                autoComplete="name"
                maxLength={100}
                required
                autoFocus
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                onBlur={() => handleBlur('email')}
                error={fieldErrors['email']}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={100}
                required
              />

              {/* Phone Number with +91 prefix */}
              <div className={styles.phoneFieldWrapper}>
                <label htmlFor={phoneId} className={styles.phoneLabel}>
                  Phone Number
                  <span className={styles.phoneRequired}>*</span>
                </label>
                <div className={`${styles.phoneInputRow} ${fieldErrors['phoneNumber'] ? styles.phoneInputRowError : ''}`}>
                  <span className={styles.phonePrefix} aria-hidden="true">+91</span>
                  <input
                    id={phoneId}
                    type="tel"
                    className={styles.phoneInput}
                    value={phoneNumber}
                    onChange={(e) => {
                      // Only allow digits
                      const digits = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(digits);
                      clearFieldError('phoneNumber');
                    }}
                    onBlur={() => handleBlur('phoneNumber')}
                    placeholder="9876543210"
                    autoComplete="tel-national"
                    maxLength={10}
                    aria-invalid={!!fieldErrors['phoneNumber']}
                    aria-describedby={fieldErrors['phoneNumber'] ? phoneErrorId : phoneHintId}
                    aria-required
                  />
                </div>
                {fieldErrors['phoneNumber'] ? (
                  <span id={phoneErrorId} className={styles.phoneError} role="alert">
                    {fieldErrors['phoneNumber']}
                  </span>
                ) : (
                  <span id={phoneHintId} className={styles.phoneHint}>
                    10-digit mobile number
                  </span>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                onBlur={() => handleBlur('password')}
                error={fieldErrors['password']}
                placeholder="Min 8 characters"
                hint="Must include uppercase, lowercase, number, and special character"
                autoComplete="new-password"
                maxLength={64}
                required
              />

              {/* Terms of Service consent */}
              <div className={styles.tosWrapper}>
                <label className={styles.tosLabel}>
                  <input
                    type="checkbox"
                    checked={tosAccepted}
                    onChange={(e) => {
                      setTosAccepted(e.target.checked);
                      clearFieldError('tos');
                    }}
                    className={styles.tosCheckbox}
                    aria-invalid={!!fieldErrors['tos']}
                  />
                  <span className={styles.tosText}>
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className={styles.tosLink}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className={styles.tosLink}>
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {fieldErrors['tos'] && (
                  <span className={styles.tosError} role="alert">
                    {fieldErrors['tos']}
                  </span>
                )}
              </div>
            </fieldset>

            <div className={styles.submitButton}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerText}>Already have an account?</span>
          <Link href="/login" className={styles.footerLink}>
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
