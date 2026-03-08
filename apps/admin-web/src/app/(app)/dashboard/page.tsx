'use client';

import { useAdminDashboard } from '@/application/admin-dashboard/use-admin-dashboard';
import { DashboardTiles } from '@/components/dashboard/DashboardTiles';

import styles from './page.module.css';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useAdminDashboard();

  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <DashboardTiles
        data={data}
        loading={loading}
        error={error?.message ?? null}
        onRetry={refetch}
      />
    </div>
  );
}
