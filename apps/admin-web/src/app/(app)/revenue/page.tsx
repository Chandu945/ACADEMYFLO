'use client';

import { useAdminRevenue } from '@/application/admin-revenue/use-admin-revenue';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RevenueKpiTile } from '@/components/admin-revenue/RevenueKpiTile';
import { TierDistribution } from '@/components/admin-revenue/TierDistribution';

import styles from './page.module.css';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const compactInr = (n: number): string => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return inrFormatter.format(n);
};

const percentFormatter = new Intl.NumberFormat('en-IN', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function AdminRevenuePage() {
  const { data, loading, error, refetch } = useAdminRevenue();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Revenue</h1>
          <p className={styles.subtitle}>
            Subscription health snapshot. Excludes administratively disabled academies.
          </p>
        </div>
        {data && (
          <div className={styles.headerMeta}>
            <span>As of {dateFormatter.format(new Date(data.asOf))}</span>
            <Button size="sm" variant="secondary" onClick={refetch}>
              Refresh
            </Button>
          </div>
        )}
      </header>

      {error && (
        <Alert variant="error" action={<Button size="sm" onClick={refetch}>Retry</Button>}>
          {error.message}
        </Alert>
      )}

      <section className={styles.kpis}>
        <RevenueKpiTile
          label="MRR"
          value={loading ? '—' : compactInr(data?.mrrInr ?? 0)}
          hint={loading ? '—' : `${data?.activePaidCount ?? 0} paid academies`}
          loading={loading}
        />
        <RevenueKpiTile
          label="ARR"
          value={loading ? '—' : compactInr(data?.arrInr ?? 0)}
          hint="MRR × 12, projected"
          loading={loading}
        />
        <RevenueKpiTile
          label="Active trials"
          value={loading ? '—' : (data?.activeTrialCount ?? 0).toLocaleString('en-IN')}
          hint="In trial window, not yet paid"
          loading={loading}
        />
        <RevenueKpiTile
          label="30-day conversion"
          value={
            loading
              ? '—'
              : data?.conversion30d.rate === null
                ? '—'
                : percentFormatter.format(data?.conversion30d.rate ?? 0)
          }
          hint={
            loading
              ? '—'
              : `${data?.conversion30d.converted ?? 0} / ${data?.conversion30d.signups ?? 0} trial signups`
          }
          loading={loading}
        />
      </section>

      <section className={styles.row}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>This month</h2>
            {!loading && data && <span className={styles.cardSubLabel}>{data.thisMonth.label}</span>}
          </header>
          {loading ? (
            <Skeleton height="48px" width="60%" />
          ) : (
            <div className={styles.monthGrid}>
              <div>
                <span className={styles.bigNumber}>{data?.thisMonth.newPaidCount ?? 0}</span>
                <span className={styles.smallLabel}>new paid academies</span>
              </div>
              <div>
                <span className={styles.bigNumber}>{compactInr(data?.thisMonth.newPaidMrrInr ?? 0)}</span>
                <span className={styles.smallLabel}>new MRR added</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Tier distribution</h2>
          </header>
          {loading ? (
            <Skeleton height="120px" />
          ) : (
            <TierDistribution slices={data?.tierDistribution ?? []} totalMrr={data?.mrrInr ?? 0} />
          )}
        </div>
      </section>
    </div>
  );
}
