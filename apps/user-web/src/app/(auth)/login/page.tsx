'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!identifier.trim()) errors['identifier'] = 'Email or phone is required';
    if (!password) errors['password'] = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [identifier, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!validate()) return;

      setLoading(true);
      try {
        const result = await login(identifier.trim(), password);

        if (!result.ok) {
          setError(result.error ?? 'Login failed. Please try again.');
          return;
        }

        router.push('/');
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [identifier, password, validate, router, login],
  );

  return (
    <div className={styles.page}>
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
          <h2 className={styles.cardTitle}>Welcome back</h2>
          <p className={styles.cardSubtitle}>Sign in to continue</p>

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

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              label="Email or Phone"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setFieldErrors((prev) => { const next = { ...prev }; delete next['identifier']; return next; });
              }}
              error={fieldErrors['identifier']}
              placeholder="Enter email or phone"
              autoComplete="username"
              maxLength={100}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => { const next = { ...prev }; delete next['password']; return next; });
              }}
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
    </div>
  );
}
