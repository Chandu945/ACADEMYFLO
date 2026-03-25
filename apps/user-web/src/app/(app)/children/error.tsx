'use client';

import { Alert } from '@/components/ui/Alert';

export default function ChildrenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
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
