'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors['fullName'] = 'Full name is required';
    if (!email.trim()) errors['email'] = 'Email is required';
    else if (!EMAIL_REGEX.test(email.trim())) errors['email'] = 'Invalid email format';
    if (!phoneNumber.trim()) errors['phoneNumber'] = 'Phone number is required';
    else if (!E164_REGEX.test(phoneNumber.trim()))
      errors['phoneNumber'] = 'Phone must be in E.164 format (e.g. +919876543210)';
    if (!password) errors['password'] = 'Password is required';
    else if (password.length < 8) errors['password'] = 'Password must be at least 8 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, phoneNumber, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!validate()) return;

      setLoading(true);
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Merge backend field errors if present
          if (data.fieldErrors) {
            setFieldErrors((prev) => ({ ...prev, ...data.fieldErrors }));
          }
          setError(data.message ?? 'Signup failed. Please try again.');
          return;
        }

        if (typeof window !== 'undefined' && data.accessToken) {
          sessionStorage.setItem('accessToken', data.accessToken);
        }

        router.push('/');
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [fullName, email, phoneNumber, password, validate, router],
  );

  return (
    <div className={styles.page}>
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
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Set up your academy in minutes</p>
        </div>

        {/* Form Card */}
        <div className={styles.card}>
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
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors['fullName']}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={100}
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors['email']}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={100}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              error={fieldErrors['phoneNumber']}
              placeholder="+919876543210"
              autoComplete="tel"
              maxLength={16}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors['password']}
              placeholder="Min 8 characters"
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
    </div>
  );
}
