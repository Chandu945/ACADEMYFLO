import { Skeleton } from '@/components/ui/Skeleton';

import styles from './page.module.css';

export default function LoginLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <Skeleton height="28px" width="160px" />
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
        </div>
      </div>
    </div>
  );
}
