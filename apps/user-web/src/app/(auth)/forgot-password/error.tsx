'use client';

import { useEffect } from 'react';

export default function ForgotPasswordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ForgotPasswordPage] Render error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        gap: '16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '360px' }}>
        We couldn&apos;t load the password reset page. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: '#0ea5e9',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
