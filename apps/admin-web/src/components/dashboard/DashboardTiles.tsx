'use client';

import type { AdminDashboardCounts } from '@/domain/admin/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Tile } from './Tile';
import styles from './DashboardTiles.module.css';

type DashboardTilesProps = {
  data: AdminDashboardCounts | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const SKELETON_COUNT = 6;

export function DashboardTiles({ data, loading, error, onRetry }: DashboardTilesProps) {
  if (loading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading dashboard">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} className={styles.skeletonTile}>
            <Skeleton height="34px" width="80px" />
            <Skeleton height="16px" width="120px" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="error"
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const tiles = [
    { label: 'Total Academies', count: data.totalAcademies },
    { label: 'Active Trials', count: data.activeTrials },
    { label: 'Active Paid', count: data.activePaid },
    { label: 'Expired (Grace)', count: data.expiredGrace },
    { label: 'Blocked', count: data.blocked },
    { label: 'Disabled', count: data.disabled },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map((t) => (
        <Tile key={t.label} label={t.label} count={t.count} />
      ))}
    </div>
  );
}
