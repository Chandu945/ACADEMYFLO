'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function SubscriptionBlockedPage() {
  const { user, logout } = useAuth();

  const isOwner = user?.role === 'OWNER';

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Shield / Lock Icon */}
        <div className={styles.iconWrapper}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className={styles.title}>Access Restricted</h1>

        <p className={styles.description}>
          {isOwner
            ? 'Your academy subscription is inactive or has expired. Please renew your subscription to continue using all features.'
            : 'Your academy\'s subscription is currently inactive. Please contact your academy administrator to restore access.'}
        </p>

        <div className={styles.actions}>
          {isOwner ? (
            <Link href="/subscription" style={{ width: '100%' }}>
              <Button variant="primary" fullWidth>
                Manage Subscription
              </Button>
            </Link>
          ) : (
            <Button variant="primary" fullWidth disabled>
              Contact Admin to Renew
            </Button>
          )}

          <div className={styles.divider}>or</div>

          <Button variant="outline" fullWidth onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
