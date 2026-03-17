'use client';

import React from 'react';
import { useDashboardKpis, useMonthlyChart, useBirthdays } from '@/application/dashboard/use-dashboard';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

const KPI_CONFIG = [
  { key: 'totalActiveStudents', label: 'Total Students', color: '#0891b2', isCurrency: false },
  { key: 'newAdmissions', label: 'New Admissions', color: '#7c3aed', isCurrency: false },
  { key: 'inactiveStudents', label: 'Inactive', color: '#64748b', isCurrency: false },
  { key: 'pendingPaymentRequests', label: 'Pending Requests', color: '#d97706', isCurrency: false },
  { key: 'collectedAmount', label: 'Collected Amount', color: '#16a34a', isCurrency: true },
  { key: 'totalPendingAmount', label: 'Pending Amount', color: '#dc2626', isCurrency: true },
  { key: 'todayPresentCount', label: 'Today Present', color: '#16a34a', isCurrency: false },
  { key: 'todayAbsentCount', label: 'Today Absent', color: '#dc2626', isCurrency: false },
  { key: 'dueStudentsCount', label: 'Due Students', color: '#d97706', isCurrency: false },
  { key: 'totalExpenses', label: 'Expenses', color: '#dc2626', isCurrency: true },
] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: kpis, loading: kpisLoading, error: kpisError, refetch: refetchKpis } = useDashboardKpis();
  const { data: _chart, loading: _chartLoading } = useMonthlyChart();
  const { data: birthdays, loading: birthdaysLoading } = useBirthdays('today');

  const handleRefresh = () => {
    refetchKpis();
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back, {user?.fullName ?? 'Owner'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={kpisLoading}>
          Refresh
        </Button>
      </div>

      {/* Error */}
      {kpisError && (
        <Alert
          variant="error"
          message={kpisError}
          action={{ label: 'Retry', onClick: refetchKpis }}
        />
      )}

      {/* KPI Grid */}
      {kpisLoading && !kpis ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} height={100} variant="rounded" className={styles.skeletonCard} />
          ))}
        </div>
      ) : kpis ? (
        <div className={styles.kpiGrid}>
          {KPI_CONFIG.map((cfg) => {
            const rawValue = kpis[cfg.key as keyof typeof kpis] ?? 0;
            const displayValue = cfg.isCurrency ? formatCurrency(rawValue) : String(rawValue);
            return (
              <div
                key={cfg.key}
                className={styles.kpiCard}
                style={{ borderLeftColor: cfg.color }}
              >
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{cfg.label}</span>
                  <span
                    className={styles.kpiIcon}
                    style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </span>
                </div>
                <span className={styles.kpiValue}>{displayValue}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Financial Overview */}
      {kpis && (
        <section>
          <h2 className={styles.sectionTitle}>Financial Overview</h2>
          <div className={styles.financialGrid}>
            <div className={`${styles.financialCard} ${styles.collected}`}>
              <span className={styles.financialLabel}>Collected This Month</span>
              <span className={styles.financialValue}>{formatCurrency(kpis.collectedAmount)}</span>
            </div>
            <div className={`${styles.financialCard} ${styles.pending}`}>
              <span className={styles.financialLabel}>Pending Amount</span>
              <span className={styles.financialValue}>{formatCurrency(kpis.totalPendingAmount)}</span>
            </div>
            <div className={`${styles.financialCard} ${styles.expenses}`}>
              <span className={styles.financialLabel}>Total Expenses</span>
              <span className={styles.financialValue}>{formatCurrency(kpis.totalExpenses)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Birthdays */}
      <section className={styles.birthdaySection}>
        <h2 className={styles.sectionTitle}>Today&apos;s Birthdays</h2>
        {birthdaysLoading ? (
          <Skeleton height={60} count={3} variant="rounded" />
        ) : birthdays.length === 0 ? (
          <EmptyState message="No birthdays today" subtitle="Check back tomorrow!" />
        ) : (
          <div className={styles.birthdayList}>
            {birthdays.map((student) => (
              <div key={student.id} className={styles.birthdayItem}>
                <Avatar src={student.profilePhotoUrl} name={student.fullName} size="md" />
                <div className={styles.birthdayInfo}>
                  <span className={styles.birthdayName}>{student.fullName}</span>
                  <span className={styles.birthdayDate}>
                    {new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {student.guardianMobile ? ` | ${student.guardianMobile}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
