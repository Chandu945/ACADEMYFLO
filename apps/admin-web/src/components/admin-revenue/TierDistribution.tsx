'use client';

import type { TierSlice } from '@/application/admin-revenue/admin-revenue.schemas';

import styles from './TierDistribution.module.css';

type Props = {
  slices: TierSlice[];
  totalMrr: number;
};

const TIER_LABELS: Record<TierSlice['tierKey'], string> = {
  TIER_0_50: '0–50 students',
  TIER_51_100: '51–100 students',
  TIER_101_PLUS: '101+ students',
};

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function TierDistribution({ slices, totalMrr }: Props) {
  const totalCount = slices.reduce((sum, s) => sum + s.count, 0);
  if (totalCount === 0) {
    return <p className={styles.empty}>No active paid academies yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {slices.map((slice) => {
        const sharePercent = totalMrr > 0 ? (slice.mrrInr / totalMrr) * 100 : 0;
        return (
          <li key={slice.tierKey} className={styles.row}>
            <div className={styles.rowHeader}>
              <span className={styles.tier}>{TIER_LABELS[slice.tierKey]}</span>
              <span className={styles.count}>
                {slice.count} {slice.count === 1 ? 'academy' : 'academies'}
              </span>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <div className={styles.barFill} style={{ width: `${sharePercent}%` }} />
            </div>
            <div className={styles.rowFooter}>
              <span className={styles.amount}>{inrFormatter.format(slice.mrrInr)}/mo</span>
              <span className={styles.share}>{sharePercent.toFixed(0)}% of MRR</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
