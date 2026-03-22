'use client';

import { useEffect } from 'react';

export default function SignupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SignupPage] Render error:', error);
  }, [error]);

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--space-6, 24px)',
        gap: 'var(--space-4, 16px)',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
        backgroundColor: 'var(--color-bg, #f0fbff)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-2xl, 20px)',
          fontWeight: 'var(--weight-semibold, 600)',
          color: 'var(--color-text, #0f172a)',
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: 'var(--text-base, 14px)',
          color: 'var(--color-text-secondary, #64748b)',
          textAlign: 'center',
          maxWidth: '360px',
        }}
      >
        We couldn&apos;t load the signup page. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          fontSize: 'var(--text-base, 14px)',
          fontWeight: 'var(--weight-semibold, 600)',
          color: 'var(--color-white, #fff)',
          backgroundColor: 'var(--color-primary, #0891b2)',
          border: 'none',
          borderRadius: 'var(--radius-md, 8px)',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </main>
  );
}
