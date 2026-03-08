'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { loginSchema } from '@/application/auth/admin-auth.schemas';
import * as authService from '@/application/auth/admin-auth.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppError } from '@/domain/common/errors';

import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await authService.login(parsed.data.email, parsed.data.password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof AppError) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.brandPanel}>
        <div className={styles.brandLogo}>PlayConnect</div>
        <div className={styles.brandTagline}>Academy Management Platform</div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your admin account</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>
              <Input
                label="Email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors['email']}
                autoComplete="email"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors['password']}
                autoComplete="current-password"
              />
              {serverError && (
                <div role="alert" className={styles.serverError}>
                  {serverError}
                </div>
              )}
              <Button type="submit" loading={loading}>
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
