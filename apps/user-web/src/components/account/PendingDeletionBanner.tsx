'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import styles from './PendingDeletionBanner.module.css';

interface PendingStatus {
  id: string;
  status: 'REQUESTED' | 'CANCELED' | 'COMPLETED';
  scheduledExecutionAt: string;
  reason: string | null;
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function PendingDeletionBanner() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingStatus | null>(null);
  const [canceling, setCanceling] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const refresh = useCallback(async () => {
    if (!isOwner) return;
    try {
      const res = await fetch('/api/account/deletion/status', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data: PendingStatus | null };
        setPending(json.data ?? null);
      }
    } catch {
      // silent — banner just stays hidden
    }
  }, [isOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCancel = useCallback(async () => {
    setCanceling(true);
    try {
      const res = await fetch('/api/account/deletion', { method: 'DELETE' });
      if (res.ok) setPending(null);
    } finally {
      setCanceling(false);
    }
  }, []);

  if (!isOwner || !pending) return null;

  const days = daysUntil(pending.scheduledExecutionAt);
  const dateStr = new Date(pending.scheduledExecutionAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const isCritical = days <= 7;

  return (
    <aside
      className={`${styles.card} ${isCritical ? styles.critical : ''}`}
      role="alert"
      aria-label={`Academy scheduled for deletion in ${days} days, on ${dateStr}`}
    >
      <span className={styles.stripe} aria-hidden />
      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.countdown}>
            <span className={styles.countdownNumber}>{days}</span>
            <span className={styles.countdownLabel}>{days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className={styles.headingWrap}>
            <span className={styles.eyebrow}>
              {isCritical ? 'FINAL WARNING' : 'DELETION SCHEDULED'}
            </span>
            <h3 className={styles.title}>Your academy will be permanently deleted</h3>
            <p className={styles.subtitle}>
              On <strong>{dateStr}</strong>. Cancel any time before then to keep all your data.
            </p>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.actions}>
          <Link href="/delete-account" className={styles.link}>
            View details ›
          </Link>
          <Button variant="danger" size="sm" onClick={onCancel} loading={canceling}>
            Cancel deletion
          </Button>
        </div>
      </div>
    </aside>
  );
}
