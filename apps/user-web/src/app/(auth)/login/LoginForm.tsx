'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { resetInitAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{10,15}$/;

function validateField(
  field: string,
  values: { identifier: string; password: string },
): string | null {
  switch (field) {
    case 'identifier': {
      const trimmed = values.identifier.trim();
      if (!trimmed) return 'Email or phone is required';
      if (!EMAIL_RE.test(trimmed) && !PHONE_RE.test(trimmed))
        return 'Enter a valid email address or phone number';
      return null;
    }
    case 'password':
      if (!values.password) return 'Password is required';
      if (values.password.length < 8) return 'Password must be at least 8 characters';
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

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const values = { identifier, password };
    const errors: Record<string, string> = {};
    for (const field of ['identifier', 'password'] as const) {
      const msg = validateField(field, values);
      if (msg) errors[field] = msg;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [identifier, password]);

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
      const values = { identifier, password };
      const msg = validateField(field, values);
      if (msg) {
        setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      }
    },
    [identifier, password],
  );

  const showError = useCallback((msg: string) => {
    setError(msg);
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
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
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
          showError(
            (typeof data['message'] === 'string' ? data['message'] : null) ??
              'Login failed. Please try again.',
          );
          return;
        }

        resetInitAuth();

        // Honour returnTo query param for deep-link return after session expiry
        const returnTo = searchParams.get('returnTo');
        const destination =
          returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
            ? returnTo
            : '/dashboard';
        router.push(destination);
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
    [identifier, password, validate, router, searchParams, showError],
  );

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        {/* Brand Section */}
        <div className={styles.brand}>
          <div className={styles.logoBadge}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l2-6 4 10 2-6" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className={styles.brandName}>PlayConnect</h1>
          <p className={styles.tagline}>Academy Management, Simplified</p>
        </div>

        {/* Form Card */}
        <div className={styles.card}>
          <h2 id="login-heading" className={styles.cardTitle}>Welcome back</h2>
          <p className={styles.cardSubtitle}>Sign in to continue</p>

          {error && (
            <div
              ref={errorBannerRef}
              className={styles.errorBanner}
              role="alert"
              tabIndex={-1}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
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
            aria-labelledby="login-heading"
          >
            <fieldset disabled={loading} className={styles.fieldset}>
              <Input
                label="Email or Phone"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearFieldError('identifier');
                }}
                onBlur={() => handleBlur('identifier')}
                error={fieldErrors['identifier']}
                placeholder="Enter email or phone"
                autoComplete="username"
                maxLength={100}
                required
                autoFocus
              />

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
                placeholder="Enter password"
                autoComplete="current-password"
                maxLength={64}
                required
              />

              <div className={styles.forgotRow}>
                <Link href="/forgot-password" className={styles.forgotLink}>
                  Forgot Password?
                </Link>
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
                Sign In
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerText}>Don&apos;t have an account?</span>
          <Link href="/signup" className={styles.footerLink}>
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
