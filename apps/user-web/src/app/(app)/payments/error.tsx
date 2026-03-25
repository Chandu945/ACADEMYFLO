'use client';

import { Alert } from '@/components/ui/Alert';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <Alert
        variant="error"
        message={error.message || 'Something went wrong'}
        action={{ label: 'Retry', onClick: reset }}
      />
    </div>
  );
}
