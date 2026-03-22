'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardPage] Render error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-16, 64px) var(--space-6, 24px)',
        gap: 'var(--space-4, 16px)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-2xl, 20px)',
          fontWeight: 'var(--weight-semibold, 600)',
          color: 'var(--color-text, #0f172a)',
        }}
      >
        Dashboard failed to load
      </h2>
      <p
        style={{
          fontSize: 'var(--text-base, 14px)',
          color: 'var(--color-text-secondary, #64748b)',
          textAlign: 'center',
          maxWidth: '360px',
        }}
      >
        An unexpected error occurred while loading the dashboard. Please try again.
      </p>
      <Button variant="primary" size="md" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
