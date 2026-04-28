'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import styles from './RevenueKpiTile.module.css';

type Props = {
  label: string;
  value: string;
  hint: string;
  loading: boolean;
};

export function RevenueKpiTile({ label, value, hint, loading }: Props) {
  return (
    <div className={styles.tile} aria-label={`${label}: ${value}`}>
      <span className={styles.label}>{label}</span>
      {loading ? (
        <Skeleton height="32px" width="80%" />
      ) : (
        <span className={styles.value}>{value}</span>
      )}
      <span className={styles.hint}>{hint}</span>
    </div>
  );
}
