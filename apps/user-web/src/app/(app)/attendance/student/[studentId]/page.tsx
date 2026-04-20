'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useStudentMonthlyAttendance } from '@/application/attendance/use-attendance';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { isValidObjectId } from '@/infra/validation/ids';
import styles from './page.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[dayOfWeek]}, ${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function attendanceBadgeVariant(status: string) {
  switch (status.toUpperCase()) {
    case 'PRESENT': return 'success' as const;
    case 'ABSENT': return 'danger' as const;
    case 'HOLIDAY': return 'warning' as const;
    default: return 'default' as const;
  }
}

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

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function StudentMonthlyAttendancePage() {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const studentId = params.studentId;
  const studentIdIsValid = isValidObjectId(studentId);
  const studentName = searchParams.get('name') || 'Student';
  const initialMonth = searchParams.get('month');

  const now = new Date();
  const [year, setYear] = useState(() => {
    if (initialMonth) {
      const [y] = initialMonth.split('-');
      return parseInt(y, 10) || now.getFullYear();
    }
    return now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    if (initialMonth) {
      const parts = initialMonth.split('-');
      return (parseInt(parts[1], 10) || (now.getMonth() + 1)) - 1;
    }
    return now.getMonth();
  });

  const monthParam = useMemo(
    () => `${year}-${String(month + 1).padStart(2, '0')}`,
    [year, month],
  );

  const { data, loading } = useStudentMonthlyAttendance(
    studentIdIsValid ? studentId : '',
    studentIdIsValid ? monthParam : '',
  );

  // Build records from absentDates and holidayDates arrays
  const filteredRecords = useMemo(() => {
    if (!data) return [];
    const records: { date: string; status: string }[] = [];
    for (const d of data.absentDates ?? []) records.push({ date: d, status: 'ABSENT' });
    for (const d of data.holidayDates ?? []) records.push({ date: d, status: 'HOLIDAY' });
    records.sort((a, b) => a.date.localeCompare(b.date));
    return records;
  }, [data]);

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  if (!studentIdIsValid) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => router.back()}>
          <BackArrow /> Back to Attendance
        </button>
        <p className={styles.empty}>Invalid student id.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button type="button" className={styles.backButton} onClick={() => router.back()}>
        <BackArrow /> Back to Attendance
      </button>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{studentName}</h1>
      </div>

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
          {data && (
            <div className={styles.summaryGrid}>
              <div className={`${styles.summaryCard} ${styles.present}`}>
                <span className={styles.summaryValue}>{data.presentCount}</span>
                <span className={styles.summaryLabel}>Present</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.absent}`}>
                <span className={styles.summaryValue}>{data.absentCount}</span>
                <span className={styles.summaryLabel}>Absent</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.holiday}`}>
                <span className={styles.summaryValue}>{data.holidayCount}</span>
                <span className={styles.summaryLabel}>Holidays</span>
              </div>
            </div>
          )}

          {/* Absent & Holiday Records List */}
          {filteredRecords.length > 0 ? (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Absent &amp; Holiday Days</h3>
              <div className={styles.recordsList}>
                {filteredRecords.map((rec) => (
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
            !data && <p className={styles.empty}>No attendance records for this month.</p>
          )}

          {data && filteredRecords.length === 0 && (
            <p className={styles.empty}>No absent or holiday days this month.</p>
          )}
        </>
      )}
    </div>
  );
}
