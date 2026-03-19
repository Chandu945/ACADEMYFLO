'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b' }}>An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              background: '#0891b2',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
