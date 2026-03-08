'use client';

import styles from '@/components/ui/ErrorPage.module.css';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.wrapper}>
      <h2>Something went wrong</h2>
      <button type="button" onClick={reset} className={styles.retryButton}>
        Try again
      </button>
    </div>
  );
}
