'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[ReportsPage] Render error:', error); }, [error]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Failed to load reports</h2>
      <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '360px' }}>An unexpected error occurred. Please try again.</p>
      <Button variant="primary" size="md" onClick={reset}>Try Again</Button>
    </div>
  );
}
