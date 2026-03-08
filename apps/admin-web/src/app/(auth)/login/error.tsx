'use client';

import styles from '@/components/ui/ErrorPage.module.css';

export default function LoginError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.wrapperCentered}>
      <div className={styles.content}>
        <h2>Something went wrong</h2>
        <button type="button" onClick={reset} className={styles.retryButton}>
          Try again
        </button>
      </div>
    </div>
  );
}
