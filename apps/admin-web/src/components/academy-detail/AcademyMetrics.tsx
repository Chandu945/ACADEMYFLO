'use client';

import type { AcademyMetrics as MetricsType } from '@/domain/admin/academy-detail';
import { Tile } from '@/components/dashboard/Tile';

import styles from './AcademyMetrics.module.css';

type AcademyMetricsProps = {
  metrics: MetricsType;
};

export function AcademyMetrics({ metrics }: AcademyMetricsProps) {
  return (
    <div className={styles.grid}>
      <Tile label="Active Students" count={metrics.activeStudentCount} />
      <Tile label="Staff Members" count={metrics.staffCount} />
      <Tile label="Revenue This Month" count={metrics.thisMonthRevenueTotal} />
    </div>
  );
}
