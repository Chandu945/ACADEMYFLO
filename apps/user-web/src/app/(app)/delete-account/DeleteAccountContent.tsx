'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

const REQUIRED_PHRASE = 'DELETE';
const COOLING_OFF_DAYS = 30;

interface PendingStatus {
  id: string;
  status: 'REQUESTED' | 'CANCELED' | 'COMPLETED';
  requestedAt: string;
  scheduledExecutionAt: string;
  reason: string | null;
  role: string;
}

export default function DeleteAccountContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pending, setPending] = useState<PendingStatus | null>(null);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = user?.role === 'OWNER';

  const refresh = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/account/deletion/status', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data: PendingStatus | null };
        setPending(json.data ?? null);
      }
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setSuccess(null);
      setFieldErrors({});

      const errs: Record<string, string> = {};
      if (password.length < 8) errs.password = 'Enter your current password to confirm.';
      if (phrase.trim().toUpperCase() !== REQUIRED_PHRASE) {
        errs.phrase = `Type "${REQUIRED_PHRASE}" exactly to confirm.`;
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/account/deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password,
            confirmationPhrase: phrase.trim().toUpperCase(),
            reason: reason.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          setPending((json.data ?? json) as PendingStatus);
          setSuccess('Account deletion scheduled.');
          setPassword('');
          setPhrase('');
          setReason('');
        } else if (res.status === 400 && json.fieldErrors) {
          setFieldErrors(json.fieldErrors as Record<string, string>);
        } else if (res.status === 401) {
          setFieldErrors({ password: json.message ?? 'Password is incorrect.' });
        } else {
          setServerError(json.message ?? 'Could not schedule deletion.');
        }
      } catch {
        setServerError('Network error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [password, phrase, reason],
  );

  const onCancel = useCallback(async () => {
    setCanceling(true);
    setServerError(null);
    try {
      const res = await fetch('/api/account/deletion', { method: 'DELETE' });
      if (res.ok) {
        setPending(null);
        setSuccess('Deletion canceled — your academy is safe.');
      } else {
        const json = await res.json().catch(() => ({}));
        setServerError(json.message ?? 'Could not cancel.');
      }
    } finally {
      setCanceling(false);
    }
  }, []);

  if (loadingStatus) {
    return (
      <div className={styles.center}>
        <Spinner />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={styles.page}>
        <Alert
          variant="info"
          title="Restricted"
          message="Account deletion is only available to academy owners."
        />
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Delete academy account</h1>
        <p className={styles.subtitle}>
          Permanently removes your academy and all associated data after a {COOLING_OFF_DAYS}-day
          cooling-off period.
        </p>
      </header>

      {success && <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />}

      {pending ? (
        <section className={styles.pendingCard}>
          <header className={styles.pendingHeader}>
            <span className={styles.pendingDot} aria-hidden />
            <h2 className={styles.pendingTitle}>Deletion scheduled</h2>
          </header>
          <p className={styles.pendingBody}>
            Your academy is scheduled to be permanently deleted on{' '}
            <strong>{new Date(pending.scheduledExecutionAt).toLocaleString()}</strong>. You can
            cancel anytime before that date.
          </p>
          {pending.reason ? (
            <p className={styles.pendingReason}>Reason: {pending.reason}</p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="primary" onClick={onCancel} loading={canceling}>
              Cancel deletion
            </Button>
            <Button variant="outline" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </section>
      ) : (
        <>
          <Alert
            variant="error"
            title="This action is permanent"
            message="All staff, students, parents, batches, attendance, fees and expenses will be deleted. Your active subscription will be canceled. Audit logs and payment receipts are retained for legal compliance."
          />

          {serverError && <Alert variant="error" message={serverError} />}

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            <Input
              label="Current password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              placeholder="Re-enter your password"
              autoComplete="current-password"
              required
            />
            <Input
              label={`Type "${REQUIRED_PHRASE}" to confirm`}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              error={fieldErrors.phrase}
              placeholder={REQUIRED_PHRASE}
              autoCapitalize="characters"
              required
            />
            <Input
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve — what made you decide?"
              maxLength={500}
            />
            <div className={styles.actions}>
              <Button type="submit" variant="danger" loading={submitting}>
                Schedule deletion ({COOLING_OFF_DAYS}-day cooling-off)
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                Keep my academy
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
