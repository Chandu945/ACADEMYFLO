'use client';

import React, { useMemo, useCallback } from 'react';
import { useDashboardKpis, useBirthdays } from '@/application/dashboard/use-dashboard';
import type { DashboardKpis } from '@/application/dashboard/use-dashboard';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

type KpiConfigItem = {
  key: keyof DashboardKpis;
  label: string;
  color: string;
  isCurrency: boolean;
  icon: string;
  roles: ReadonlyArray<'OWNER' | 'STAFF' | 'PARENT'>;
};

const KPI_CONFIG: readonly KpiConfigItem[] = [
  { key: 'totalStudents', label: 'Total Students', color: '#0891b2', isCurrency: false, icon: 'users', roles: ['OWNER', 'STAFF'] },
  { key: 'newAdmissions', label: 'New Admissions', color: '#7c3aed', isCurrency: false, icon: 'user-plus', roles: ['OWNER', 'STAFF'] },
  { key: 'inactiveStudents', label: 'Inactive', color: '#64748b', isCurrency: false, icon: 'user-x', roles: ['OWNER'] },
  { key: 'pendingPaymentRequests', label: 'Pending Requests', color: '#d97706', isCurrency: false, icon: 'clock', roles: ['OWNER'] },
  { key: 'totalCollected', label: 'Collected Amount', color: '#16a34a', isCurrency: true, icon: 'check-circle', roles: ['OWNER'] },
  { key: 'totalPendingAmount', label: 'Pending Amount', color: '#dc2626', isCurrency: true, icon: 'alert-circle', roles: ['OWNER'] },
  { key: 'todayPresentCount', label: 'Today Present', color: '#16a34a', isCurrency: false, icon: 'check', roles: ['OWNER', 'STAFF'] },
  { key: 'todayAbsentCount', label: 'Today Absent', color: '#dc2626', isCurrency: false, icon: 'x', roles: ['OWNER', 'STAFF'] },
  { key: 'dueStudentsCount', label: 'Due Students', color: '#d97706', isCurrency: false, icon: 'alert-triangle', roles: ['OWNER'] },
  { key: 'totalExpenses', label: 'Expenses', color: '#dc2626', isCurrency: true, icon: 'trending-down', roles: ['OWNER'] },
] as const;

const ICON_PATHS: Record<string, string> = {
  'users': 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6',
  'user-x': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8l5 5M23 8l-5 5',
  'clock': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  'alert-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v4M12 16h.01',
  'check': 'M20 6 9 17l-5-5',
  'x': 'M18 6 6 18M6 6l12 12',
  'alert-triangle': 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  'trending-down': 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
};

/** Cached INR formatter — avoids re-creating Intl.NumberFormat on every call */
const INR_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return INR_FORMAT.format(amount);
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  } else {
    return 'transparent';
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mask a phone number for privacy: show only last 4 digits */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return '****' + phone.slice(-4);
}

function KpiIcon({ icon, color }: { icon: string; color: string }) {
  const d = ICON_PATHS[icon] ?? ICON_PATHS['check-circle'];
  return (
    <span className={styles.kpiIcon} style={{ backgroundColor: hexToRgba(color, 0.08), color }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}

export default function DashboardContent() {
  const { user } = useAuth();
  const { data: kpis, loading: kpisLoading, error: kpisError, refetch: refetchKpis } = useDashboardKpis();
  const { data: birthdays, loading: birthdaysLoading, error: birthdaysError, refetch: refetchBirthdays } = useBirthdays('today');

  const userRole = user?.role ?? 'OWNER';

  const visibleKpis = useMemo(
    () => KPI_CONFIG.filter((cfg) => cfg.roles.includes(userRole)),
    [userRole],
  );

  const showFinancials = userRole === 'OWNER';
  const isParent = userRole === 'PARENT';

  const handleRefresh = useCallback(() => {
    refetchKpis();
    refetchBirthdays();
  }, [refetchKpis, refetchBirthdays]);

  const isInitialLoad = kpisLoading && !kpis;

  /** Safely get a numeric KPI value — guards against non-numeric responses */
  const getKpiValue = (key: keyof DashboardKpis): number => {
    if (!kpis) return 0;
    const raw = kpis[key];
    return typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0;
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={kpisLoading || birthdaysLoading}>
          Refresh
        </Button>
      </div>

      {/* Parent role — helpful message when no KPIs are available */}
      {isParent && visibleKpis.length === 0 && !isInitialLoad && (
        <Alert
          variant="info"
          message="Your child's attendance, fees, and updates are available from the sidebar navigation."
        />
      )}

      {/* KPI Error */}
      {kpisError && (
        <Alert
          variant="error"
          message={kpisError}
          action={{ label: 'Retry', onClick: refetchKpis }}
        />
      )}

      {/* KPI Grid */}
      {visibleKpis.length > 0 && (
        <>
          {isInitialLoad ? (
            <div className={styles.kpiGrid}>
              {Array.from({ length: visibleKpis.length }, (_, i) => (
                <div key={i} className={styles.kpiCardSkeleton}>
                  <Skeleton height={14} width="60%" variant="rounded" />
                  <Skeleton height={32} width="40%" variant="rounded" />
                </div>
              ))}
            </div>
          ) : kpis ? (
            <div className={styles.kpiGrid}>
              {visibleKpis.map((cfg) => {
                const rawValue = getKpiValue(cfg.key);
                const displayValue = cfg.isCurrency ? formatCurrency(rawValue) : rawValue.toLocaleString('en-IN');
                return (
                  <div
                    key={cfg.key}
                    className={styles.kpiCard}
                    style={{ borderLeftColor: cfg.color }}
                    role="region"
                    aria-label={`${cfg.label}: ${displayValue}`}
                  >
                    <div className={styles.kpiHeader}>
                      <span className={styles.kpiLabel}>{cfg.label}</span>
                      <KpiIcon icon={cfg.icon} color={cfg.color} />
                    </div>
                    <span className={styles.kpiValue}>{displayValue}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}

      {/* Financial Overview */}
      {showFinancials && (
        <>
          {isInitialLoad ? (
            <section>
              <h2 className={styles.sectionTitle}>Financial Overview</h2>
              <div className={styles.financialGrid}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.financialCardSkeleton}>
                    <Skeleton height={14} width="50%" variant="rounded" />
                    <Skeleton height={36} width="60%" variant="rounded" />
                  </div>
                ))}
              </div>
            </section>
          ) : kpis ? (
            <section>
              <h2 className={styles.sectionTitle}>Financial Overview</h2>
              <div className={styles.financialGrid}>
                <div className={`${styles.financialCard} ${styles.collected}`} role="region" aria-label={`Collected This Month: ${formatCurrency(getKpiValue('totalCollected'))}`}>
                  <span className={styles.financialLabel}>Collected This Month</span>
                  <span className={styles.financialValue}>{formatCurrency(getKpiValue('totalCollected'))}</span>
                </div>
                <div className={`${styles.financialCard} ${styles.pending}`} role="region" aria-label={`Pending Amount: ${formatCurrency(getKpiValue('totalPendingAmount'))}`}>
                  <span className={styles.financialLabel}>Pending Amount</span>
                  <span className={styles.financialValue}>{formatCurrency(getKpiValue('totalPendingAmount'))}</span>
                </div>
                <div className={`${styles.financialCard} ${styles.expenses}`} role="region" aria-label={`Total Expenses: ${formatCurrency(getKpiValue('totalExpenses'))}`}>
                  <span className={styles.financialLabel}>Total Expenses</span>
                  <span className={styles.financialValue}>{formatCurrency(getKpiValue('totalExpenses'))}</span>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* Birthdays */}
      <section className={styles.birthdaySection}>
        <h2 className={styles.sectionTitle}>Today&apos;s Birthdays</h2>

        {birthdaysError && (
          <Alert
            variant="error"
            message={birthdaysError}
            action={{ label: 'Retry', onClick: refetchBirthdays }}
          />
        )}

        {birthdaysLoading && birthdays.length === 0 ? (
          <div className={styles.birthdayList}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.birthdayItemSkeleton}>
                <Skeleton height={40} width={40} variant="circle" />
                <div style={{ flex: 1 }}>
                  <Skeleton height={14} width="50%" variant="rounded" />
                  <Skeleton height={12} width="30%" variant="rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !birthdaysError && birthdays.length === 0 ? (
          <EmptyState message="No birthdays today" subtitle="Check back tomorrow!" />
        ) : (
          <div className={styles.birthdayList}>
            {birthdays.map((student) => (
              <div key={student.id} className={styles.birthdayItem}>
                <Avatar src={student.profilePhotoUrl} name={student.fullName} size="md" />
                <div className={styles.birthdayInfo}>
                  <span className={styles.birthdayName}>{student.fullName}</span>
                  <span className={styles.birthdayDate}>
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                    {student.guardianMobile ? ` | ${maskPhone(student.guardianMobile)}` : ''}
                  </span>
                </div>
                <span className={styles.birthdayBadge} aria-label="Birthday">🎂</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
