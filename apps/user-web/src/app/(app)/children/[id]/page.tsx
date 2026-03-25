'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useChildren, useChildAttendance, useChildFees } from '@/application/parent/use-parent';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

/* ── Formatters ──────────────────────────────────────────────────────── */

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatMonthKey(monthKey: string): string {
  // monthKey can be "YYYY-MM" or "January 2025" etc.
  if (/^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }
  return monthKey;
}

function attendanceBadgeVariant(status: string) {
  switch (status.toUpperCase()) {
    case 'PRESENT': return 'success' as const;
    case 'ABSENT': return 'danger' as const;
    case 'HOLIDAY': return 'warning' as const;
    default: return 'default' as const;
  }
}

function feeBadgeVariant(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID': return 'success' as const;
    case 'DUE': return 'danger' as const;
    case 'UPCOMING': return 'info' as const;
    default: return 'default' as const;
  }
}

/* ── Chevron SVG icons ───────────────────────────────────────────────── */

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ── Attendance Tab Content ──────────────────────────────────────────── */

function AttendanceContent({ studentId }: { studentId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const monthParam = useMemo(
    () => `${year}-${String(month + 1).padStart(2, '0')}`,
    [year, month],
  );

  const { data, loading } = useChildAttendance(studentId, monthParam);

  const summary = (data as Record<string, unknown> | null)?.summary as
    | { present: number; absent: number; holidays: number; total: number }
    | undefined;

  const records = ((data as Record<string, unknown> | null)?.records ?? []) as Array<{
    date: string;
    status: string;
  }>;

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className={styles.section}>
      {/* Month Picker */}
      <div className={styles.monthPicker}>
        <button type="button" className={styles.monthNavBtn} onClick={handlePrev} aria-label="Previous month">
          <ChevronLeft />
        </button>
        <span className={styles.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" className={styles.monthNavBtn} onClick={handleNext} aria-label="Next month">
          <ChevronRight />
        </button>
      </div>

      {loading ? (
        <div className={styles.loaderWrap}><Spinner size="md" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className={styles.summaryGrid}>
              <div className={`${styles.summaryCard} ${styles.present}`}>
                <span className={styles.summaryValue}>{summary.present}</span>
                <span className={styles.summaryLabel}>Present</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.absent}`}>
                <span className={styles.summaryValue}>{summary.absent}</span>
                <span className={styles.summaryLabel}>Absent</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.holiday}`}>
                <span className={styles.summaryValue}>{summary.holidays}</span>
                <span className={styles.summaryLabel}>Holidays</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.total}`}>
                <span className={styles.summaryValue}>{summary.total}</span>
                <span className={styles.summaryLabel}>Total Days</span>
              </div>
            </div>
          )}

          {/* Records List */}
          {records.length > 0 ? (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Daily Records</h3>
              <div className={styles.recordsList}>
                {records.map((rec) => (
                  <div key={rec.date} className={styles.recordItem}>
                    <span className={styles.recordDate}>{formatDate(rec.date)}</span>
                    <Badge variant={attendanceBadgeVariant(rec.status)}>
                      {rec.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !summary && <p className={styles.empty}>No attendance records for this month.</p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Fees Tab Content ────────────────────────────────────────────────── */

function FeesContent({ studentId }: { studentId: string }) {
  const { data: fees, loading } = useChildFees(studentId);

  if (loading) {
    return <div className={styles.loaderWrap}><Spinner size="md" /></div>;
  }

  if (!fees || fees.length === 0) {
    return <p className={styles.empty}>No fee records found.</p>;
  }

  return (
    <div className={styles.section}>
      <div className={styles.feesList}>
        {fees.map((fee) => {
          const id = (fee._id ?? fee.monthKey) as string;
          const monthKey = (fee.monthKey ?? '') as string;
          const amount = (fee.amount ?? 0) as number;
          const lateFee = (fee.lateFee ?? 0) as number;
          const totalDue = (fee.totalDue ?? amount + lateFee) as number;
          const status = ((fee.status ?? 'DUE') as string).toUpperCase();

          return (
            <div key={id} className={styles.feeCard}>
              <div className={styles.feeInfo}>
                <span className={styles.feeMonth}>{formatMonthKey(monthKey)}</span>
                <div className={styles.feeBreakdown}>
                  <span>Amount: {currencyFormatter.format(amount)}</span>
                  {lateFee > 0 && <span>Late Fee: {currencyFormatter.format(lateFee)}</span>}
                </div>
              </div>
              <div className={styles.feeRight}>
                <span className={styles.feeTotal}>{currencyFormatter.format(totalDue)}</span>
                <Badge variant={feeBadgeVariant(status)}>{status}</Badge>
                {status === 'DUE' && (
                  <Link
                    href={`/children/${studentId}/pay?dueId=${id}`}
                    className={styles.payBtn}
                  >
                    Pay Now
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const { data: children, loading: childrenLoading } = useChildren();
  const [tab, setTab] = useState('attendance');

  const child = children.find(
    (c) => (c as Record<string, unknown>).studentId === studentId,
  );
  const childName = child?.fullName ?? 'Child';

  return (
    <div className={styles.page}>
      {/* Back Link */}
      <Link href="/children" className={styles.backButton}>
        <ChevronLeft />
        Back to Children
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {childrenLoading ? 'Loading...' : childName}
        </h1>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          {
            key: 'attendance',
            label: 'Attendance',
            content: <AttendanceContent studentId={studentId} />,
          },
          {
            key: 'fees',
            label: 'Fees',
            content: <FeesContent studentId={studentId} />,
          },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
    </div>
  );
}
