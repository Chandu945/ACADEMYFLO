'use client';

import React, { useMemo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useDashboardKpis, useBirthdays } from '@/application/dashboard/use-dashboard';
import type { DashboardKpis } from '@/application/dashboard/use-dashboard';
import { useAuth } from '@/application/auth/use-auth';
import { useChildren, usePaymentHistory } from '@/application/parent/use-parent';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
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

/** Get time-of-day greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Check if a date string is today */
function isBirthdayToday(dateOfBirth: string): boolean {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
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

/** Inline SVG icon component for quick action buttons */
function ActionIcon({ path, color, bg, size = 48 }: { path: string; color: string; bg: string; size?: number }) {
  return (
    <span className={styles.quickActionIcon} style={{ backgroundColor: bg, color, width: size, height: size }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}

/** Inline SVG icon for stat cards */
function StatIcon({ path, color, bg }: { path: string; color: string; bg: string }) {
  return (
    <span className={styles.quickStatIcon} style={{ backgroundColor: bg, color }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}

export default function DashboardContent() {
  const { user } = useAuth();
  const { data: kpis, loading: kpisLoading, error: kpisError, refetch: refetchKpis } = useDashboardKpis();
  const { data: birthdays, loading: birthdaysLoading, error: birthdaysError, refetch: refetchBirthdays } = useBirthdays('month');

  const userRole = user?.role ?? 'OWNER';

  const visibleKpis = useMemo(
    () => KPI_CONFIG.filter((cfg) => (cfg.roles as readonly string[]).includes(userRole)),
    [userRole],
  );

  const showFinancials = userRole === 'OWNER';
  const isParent = userRole === 'PARENT';
  const isStaff = userRole === 'STAFF';
  const isOwner = userRole === 'OWNER';

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

  // Split birthdays: today vs rest of month
  const { todayBirthdays, monthBirthdays } = useMemo(() => {
    const today: typeof birthdays = [];
    const month: typeof birthdays = [];
    for (const s of birthdays) {
      if (s.dateOfBirth && isBirthdayToday(s.dateOfBirth)) {
        today.push(s);
      } else {
        month.push(s);
      }
    }
    return { todayBirthdays: today, monthBirthdays: month };
  }, [birthdays]);

  // Should show onboarding card for owner with no students
  const showOnboarding = isOwner && kpis && getKpiValue('totalStudents') === 0;

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

      {/* Owner Onboarding Card — when no students yet */}
      {showOnboarding && (
        <div className={styles.onboardingCard}>
          <span className={styles.onboardingIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09ZM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3" />
            </svg>
          </span>
          <span className={styles.onboardingTitle}>Get Started</span>
          <span className={styles.onboardingSubtitle}>
            Add your first student to begin managing your academy
          </span>
          <Link href="/students/new">
            <Button variant="primary" size="md">Add Student</Button>
          </Link>
        </div>
      )}

      {/* Parent role — greeting, quick stats, quick actions, child summary cards, and recent payments */}
      {isParent && <ParentDashboardSection userName={user?.fullName} />}

      {/* Staff role — rich dashboard with stats, quick actions */}
      {isStaff && <StaffDashboardSection kpis={kpis} kpisLoading={kpisLoading} />}

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

      {/* Birthdays — for non-parent roles (owner + staff) */}
      {!isParent && (
        <BirthdaySection
          todayBirthdays={todayBirthdays}
          monthBirthdays={monthBirthdays}
          loading={birthdaysLoading}
          error={birthdaysError}
          onRetry={refetchBirthdays}
        />
      )}
    </div>
  );
}

/* ── Birthday Section with Today / This Month toggle ─────────────────── */

type BirthdayStudent = {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  guardianMobile: string;
};

function BirthdaySection({
  todayBirthdays,
  monthBirthdays,
  loading,
  error,
  onRetry,
}: {
  todayBirthdays: BirthdayStudent[];
  monthBirthdays: BirthdayStudent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [monthExpanded, setMonthExpanded] = useState(false);

  const allEmpty = todayBirthdays.length === 0 && monthBirthdays.length === 0;

  return (
    <section className={styles.birthdaySection}>
      <h2 className={styles.sectionTitle}>Birthdays</h2>

      {error && (
        <Alert
          variant="error"
          message={error}
          action={{ label: 'Retry', onClick: onRetry }}
        />
      )}

      {loading && allEmpty ? (
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
      ) : !error && allEmpty ? (
        <EmptyState message="No birthdays this month" subtitle="Check back next month!" />
      ) : (
        <>
          {/* Today's Birthdays */}
          {todayBirthdays.length > 0 && (
            <>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Today
              </p>
              <div className={styles.birthdayList}>
                {todayBirthdays.map((student) => (
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
            </>
          )}

          {todayBirthdays.length === 0 && monthBirthdays.length > 0 && (
            <EmptyState message="No birthdays today" subtitle="" />
          )}

          {/* This Month (collapsed) */}
          {monthBirthdays.length > 0 && (
            <div className={styles.monthBirthdayCollapsed}>
              <button
                type="button"
                className={styles.monthBirthdayHeader}
                onClick={() => setMonthExpanded((prev) => !prev)}
                aria-expanded={monthExpanded}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`${styles.monthBirthdayChevron} ${monthExpanded ? styles.monthBirthdayChevronOpen : ''}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
                This Month ({monthBirthdays.length})
              </button>
              {monthExpanded && (
                <div className={styles.birthdayList}>
                  {monthBirthdays.map((student) => (
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
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ── Staff Dashboard Section ──────────────────────────────────────────── */

function StaffDashboardSection({ kpis, kpisLoading }: { kpis: DashboardKpis | null; kpisLoading: boolean }) {
  const todayPresent = kpis?.todayPresentCount ?? 0;
  const todayAbsent = kpis?.todayAbsentCount ?? 0;
  const pendingRequests = kpis?.pendingPaymentRequests ?? 0;
  const isInitial = kpisLoading && !kpis;

  return (
    <>
      {/* Quick Stats Grid — 2x2 */}
      <section>
        <h2 className={styles.sectionTitle}>Quick Stats</h2>
        {isInitial ? (
          <div className={`${styles.quickStatsGrid} ${styles.cols2}`}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.quickStatCard}>
                <Skeleton height={40} width={40} variant="circle" />
                <Skeleton height={24} width="40%" variant="rounded" />
                <Skeleton height={12} width="60%" variant="rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className={`${styles.quickStatsGrid} ${styles.cols2}`}>
            {/* Today's Attendance */}
            <div className={styles.quickStatCard}>
              <StatIcon
                path="M20 6 9 17l-5-5"
                color="#16a34a"
                bg="rgba(22, 163, 106, 0.08)"
              />
              <span className={styles.quickStatValue}>
                <span style={{ color: '#16a34a' }}>{todayPresent}</span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}> / </span>
                <span style={{ color: '#dc2626' }}>{todayAbsent}</span>
              </span>
              <span className={styles.quickStatLabel}>Present / Absent</span>
            </div>

            {/* Pending Requests */}
            <div className={styles.quickStatCard}>
              <StatIcon
                path="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"
                color="#d97706"
                bg="rgba(217, 119, 6, 0.08)"
              />
              <span className={styles.quickStatValue} style={{ color: pendingRequests > 0 ? '#d97706' : undefined }}>
                {pendingRequests}
              </span>
              <span className={styles.quickStatLabel}>Pending Requests</span>
            </div>

            {/* Upcoming Events */}
            <Link href="/events" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickStatCard} style={{ cursor: 'pointer' }}>
                <StatIcon
                  path="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                  color="#7c3aed"
                  bg="rgba(124, 58, 237, 0.08)"
                />
                <span className={styles.quickStatValue} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                  View Events
                </span>
                <span className={styles.quickStatLabel}>Upcoming Events</span>
              </div>
            </Link>

            {/* Follow-ups Today */}
            <Link href="/enquiries" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickStatCard} style={{ cursor: 'pointer' }}>
                <StatIcon
                  path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  color="#0891b2"
                  bg="rgba(8, 145, 178, 0.08)"
                />
                <span className={styles.quickStatValue} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                  View Enquiries
                </span>
                <span className={styles.quickStatLabel}>Follow-ups Today</span>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* Quick Actions Row */}
      <section>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActionsRow}>
          <Link href="/attendance" className={styles.quickActionItem}>
            <ActionIcon
              path="M20 6 9 17l-5-5"
              color="#16a34a"
              bg="rgba(22, 163, 106, 0.1)"
            />
            <span className={styles.quickActionLabel}>Mark Attendance</span>
          </Link>

          <Link href="/students/new" className={styles.quickActionItem}>
            <ActionIcon
              path="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
              color="#7c3aed"
              bg="rgba(124, 58, 237, 0.1)"
            />
            <span className={styles.quickActionLabel}>Add Student</span>
          </Link>

          <Link href="/fees/new-request" className={styles.quickActionItem}>
            <ActionIcon
              path="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
              color="#d97706"
              bg="rgba(217, 119, 6, 0.1)"
            />
            <span className={styles.quickActionLabel}>Fee Request</span>
          </Link>

          <Link href="/enquiries/new" className={styles.quickActionItem}>
            <ActionIcon
              path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"
              color="#0891b2"
              bg="rgba(8, 145, 178, 0.1)"
            />
            <span className={styles.quickActionLabel}>New Enquiry</span>
          </Link>
        </div>
      </section>
    </>
  );
}

/* ── Parent Dashboard Section ─────────────────────────────────────────── */

function ParentDashboardSection({ userName }: { userName?: string }) {
  const { data: children, loading: childrenLoading } = useChildren();
  const { data: payments, loading: paymentsLoading } = usePaymentHistory();

  const recentPayments = useMemo(() => {
    if (!Array.isArray(payments)) return [];
    return payments.slice(0, 5);
  }, [payments]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const count = children.length;
    const totalAttendance = children.reduce((sum, c) => sum + (c.currentMonthAttendancePercent ?? 0), 0);
    const avgAttendance = count > 0 ? Math.round(totalAttendance / count) : 0;
    const totalFee = children.reduce((sum, c) => sum + (c.monthlyFee ?? 0), 0);
    return { count, avgAttendance, totalFee };
  }, [children]);

  // Calculate "Paid This Month" from payment history
  const paidThisMonth = useMemo(() => {
    if (!Array.isArray(payments)) return { total: 0, count: 0 };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let total = 0;
    let count = 0;
    for (const p of payments) {
      const payment = p as Record<string, unknown>;
      const paidAt = typeof payment.paidAt === 'string' ? new Date(payment.paidAt) : null;
      const status = typeof payment.status === 'string' ? payment.status : '';
      if (paidAt && paidAt.getMonth() === currentMonth && paidAt.getFullYear() === currentYear && status === 'COMPLETED') {
        total += typeof payment.amount === 'number' ? payment.amount : 0;
        count += 1;
      }
    }
    return { total, count };
  }, [payments]);

  // Attendance color
  const attendanceColor = stats.avgAttendance >= 75 ? '#16a34a' : stats.avgAttendance >= 50 ? '#d97706' : '#dc2626';

  return (
    <>
      {/* Greeting */}
      <div>
        <p className={styles.greeting}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </p>
        <p className={styles.greetingSub}>
          Here&apos;s your family overview
        </p>
      </div>

      {/* Quick Stats */}
      {!childrenLoading && children.length > 0 && (
        <section>
          <div className={styles.quickStatsGrid}>
            {/* My Children */}
            <div className={styles.quickStatCard}>
              <StatIcon
                path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                color="#0891b2"
                bg="rgba(8, 145, 178, 0.08)"
              />
              <span className={styles.quickStatValue}>{stats.count}</span>
              <span className={styles.quickStatLabel}>My Children</span>
            </div>

            {/* Avg Attendance */}
            <div className={styles.quickStatCard}>
              <StatIcon
                path="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
                color={attendanceColor}
                bg={hexToRgba(attendanceColor, 0.08)}
              />
              <span className={styles.quickStatValue} style={{ color: attendanceColor }}>
                {stats.avgAttendance}%
              </span>
              <span className={styles.quickStatLabel}>Avg Attendance</span>
            </div>

            {/* Monthly Fee */}
            <div className={styles.quickStatCard}>
              <StatIcon
                path="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                color="#7c3aed"
                bg="rgba(124, 58, 237, 0.08)"
              />
              <span className={styles.quickStatValue}>{formatCurrency(stats.totalFee)}</span>
              <span className={styles.quickStatLabel}>Monthly Fee</span>
            </div>
          </div>
        </section>
      )}

      {/* Paid This Month Banner */}
      {!paymentsLoading && paidThisMonth.count > 0 && (
        <div className={styles.paidBanner}>
          <span className={styles.paidBannerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
            </svg>
          </span>
          <div className={styles.paidBannerContent}>
            <span className={styles.paidBannerAmount}>{formatCurrency(paidThisMonth.total)} paid this month</span>
            <span className={styles.paidBannerLabel}>
              {paidThisMonth.count} payment{paidThisMonth.count !== 1 ? 's' : ''} completed
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions Row */}
      <section>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActionsRow}>
          <Link href="/children" className={styles.quickActionItem}>
            <ActionIcon
              path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              color="#0891b2"
              bg="rgba(8, 145, 178, 0.1)"
            />
            <span className={styles.quickActionLabel}>My Children</span>
          </Link>

          <Link href="/payments" className={styles.quickActionItem}>
            <ActionIcon
              path="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
              color="#16a34a"
              bg="rgba(22, 163, 106, 0.1)"
            />
            <span className={styles.quickActionLabel}>Payments</span>
          </Link>

          <Link href="/academy-info" className={styles.quickActionItem}>
            <ActionIcon
              path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z M9 22V12h6v10"
              color="#7c3aed"
              bg="rgba(124, 58, 237, 0.1)"
            />
            <span className={styles.quickActionLabel}>Academy Info</span>
          </Link>

          <Link href="/profile" className={styles.quickActionItem}>
            <ActionIcon
              path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              color="#d97706"
              bg="rgba(217, 119, 6, 0.1)"
            />
            <span className={styles.quickActionLabel}>My Profile</span>
          </Link>
        </div>
      </section>

      {/* Children Summary */}
      <section>
        <h2 className={styles.sectionTitle}>My Children</h2>
        {childrenLoading ? (
          <div className={styles.financialGrid}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.financialCardSkeleton}>
                <Skeleton height={40} width={40} variant="circle" />
                <Skeleton height={14} width="60%" variant="rounded" />
              </div>
            ))}
          </div>
        ) : children.length === 0 ? (
          <EmptyState message="No children linked" subtitle="Contact your academy to link your children to your account." />
        ) : (
          <div className={styles.kpiGrid}>
            {children.map((child) => (
              <Link
                key={child.studentId}
                href={`/children/${child.studentId}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className={styles.kpiCard} style={{ borderLeftColor: '#0891b2', cursor: 'pointer' }}>
                  <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>{child.fullName}</span>
                    <Badge variant={child.status?.toLowerCase() === 'active' ? 'success' : 'warning'} dot>
                      {child.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.kpiValue}>
                      {formatCurrency(child.monthlyFee)}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-secondary)', marginLeft: 'var(--space-1)' }}>/mo</span>
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', color: child.currentMonthAttendancePercent != null && child.currentMonthAttendancePercent >= 75 ? '#16a34a' : child.currentMonthAttendancePercent != null && child.currentMonthAttendancePercent >= 50 ? '#d97706' : '#dc2626' }}>
                      {child.currentMonthAttendancePercent != null ? `${Math.round(child.currentMonthAttendancePercent)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Payments */}
      <section className={styles.birthdaySection}>
        <h2 className={styles.sectionTitle}>Recent Payments</h2>
        {paymentsLoading ? (
          <div className={styles.birthdayList}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.birthdayItemSkeleton}>
                <Skeleton height={14} width="40%" variant="rounded" />
                <Skeleton height={14} width="30%" variant="rounded" />
              </div>
            ))}
          </div>
        ) : recentPayments.length === 0 ? (
          <EmptyState message="No payments yet" subtitle="Your payment history will appear here." />
        ) : (
          <div className={styles.birthdayList}>
            {recentPayments.map((p, idx) => {
              const payment = p as Record<string, unknown>;
              const amount = typeof payment.amount === 'number' ? payment.amount : 0;
              const paidAt = typeof payment.paidAt === 'string' ? new Date(payment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
              const studentName = typeof payment.studentName === 'string' ? payment.studentName : 'Student';
              const status = typeof payment.status === 'string' ? payment.status : 'COMPLETED';
              return (
                <div key={idx} className={styles.birthdayItem}>
                  <div className={styles.birthdayInfo}>
                    <span className={styles.birthdayName}>{studentName}</span>
                    <span className={styles.birthdayDate}>{paidAt} — {formatCurrency(amount)}</span>
                  </div>
                  <Badge variant={status === 'COMPLETED' ? 'success' : status === 'PENDING' ? 'warning' : 'danger'}>
                    {status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
        {recentPayments.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            <Link href="/payments" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
              View All Payments →
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
