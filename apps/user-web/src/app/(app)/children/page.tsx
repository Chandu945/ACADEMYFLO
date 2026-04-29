'use client';

import React from 'react';
import Link from 'next/link';
import { useChildren } from '@/application/parent/use-parent';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import styles from './page.module.css';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function statusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success' as const;
    case 'inactive':
      return 'warning' as const;
    case 'left':
      return 'danger' as const;
    default:
      return 'default' as const;
  }
}

/** SVG attendance ring with percentage fill. */
function AttendanceRing({ percent }: { percent: number | null }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const hasValue = percent !== null && percent !== undefined;
  const offset = hasValue ? circumference - (percent / 100) * circumference : circumference;

  // Pick a color based on attendance level
  const strokeColor = !hasValue
    ? 'var(--color-border)'
    : percent >= 75
      ? 'var(--color-success, #16a34a)'
      : percent >= 50
        ? 'var(--color-warning, #f59e0b)'
        : 'var(--color-danger, #ef4444)';

  return (
    <div className={styles.attendanceRing}>
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        {/* Background track */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="6"
        />
        {/* Filled arc */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className={styles.attendanceValue}>
        {hasValue ? `${Math.round(percent)}%` : 'N/A'}
      </span>
    </div>
  );
}

export default function ChildrenPage() {
  const { data: children, loading, refetch } = useChildren();

  if (loading && children.length === 0) {
    return <Spinner centered size="lg" />;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>My Children</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          loading={loading}
          iconLeft={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
          }
        >
          Refresh
        </Button>
      </div>

      {/* Content */}
      {children.length === 0 ? (
        <EmptyState
          message="No children found"
          subtitle="Your children's profiles will appear here once they are added by the academy."
        />
      ) : (
        <div className={styles.grid}>
          {children.map((child) => (
            <div key={child.studentId} className={styles.childCard}>
              <Avatar name={child.fullName} size="lg" />
              <span className={styles.childName}>{child.fullName}</span>
              <Badge variant={statusBadgeVariant(child.status)} dot>
                {child.status}
              </Badge>

              <AttendanceRing percent={child.currentMonthAttendancePercent} />
              <span className={styles.attendanceLabel}>Attendance this month</span>

              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Monthly Fee</span>
                  <span className={styles.statValue}>
                    {currencyFormatter.format(child.monthlyFee)}
                  </span>
                </div>
                {/* Surface unpaid aggregates from the new backend contract.
                    Only render when the field is present and non-zero so the
                    card stays compact for parents who are paid up. */}
                {(child.totalUnpaidMonths ?? 0) > 0 && (
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Unpaid</span>
                    <span className={styles.statValue}>
                      {currencyFormatter.format(child.totalUnpaidAmount ?? 0)}
                      <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        ({child.totalUnpaidMonths} mo)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <Link href={`/children/${child.studentId}`} style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm" fullWidth>
                    View Details
                  </Button>
                </Link>
                {/* If backend says there's a current-month fee that isn't
                    PAID, give a one-tap path to the existing /pay flow. */}
                {child.currentMonthFeeDueId && child.currentMonthFeeStatus && child.currentMonthFeeStatus !== 'PAID' && (
                  <Link
                    href={`/children/${child.studentId}/pay?feeDueId=${encodeURIComponent(child.currentMonthFeeDueId)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="secondary" size="sm" fullWidth>
                      Pay {currencyFormatter.format(child.currentMonthFeeAmount ?? 0)}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
