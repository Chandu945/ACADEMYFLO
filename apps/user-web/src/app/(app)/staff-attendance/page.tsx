'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useStaff } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function toISODate(d: Date) {
  return d.toLocaleDateString('en-CA');
}

type MonthlySummaryItem = {
  staffId: string;
  staffName: string;
  present: number;
  absent: number;
  totalWorkingDays: number;
};

function toMonthString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default function StaffAttendancePage() {
  const { accessToken } = useAuth();
  const today = toISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState('daily');

  const { data: staff, loading, error } = useStaff();

  const [actionError, setActionError] = useState<string | null>(null);
  const [staffStatuses, setStaffStatuses] = useState<Record<string, string>>({});
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Monthly summary state
  const [selectedMonth, setSelectedMonth] = useState(toMonthString(new Date()));
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryItem[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const monthlyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      monthlyAbortRef.current?.abort();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Load existing staff attendance data when date changes
  useEffect(() => {
    if (!accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetchingAttendance(true);
    (async () => {
      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(`/api/staff-attendance?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (controller.signal.aborted) return;

        let json: Record<string, unknown> | null = null;
        try { json = await res.json(); } catch { /* non-JSON */ }
        if (controller.signal.aborted) return;

        if (res.ok && json) {
          const entries = (json['data'] ?? json['items'] ?? json) as Array<Record<string, string>>;
          const map: Record<string, string> = {};
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              const id = entry['staffId'] || entry['staffUserId'];
              if (id && entry['status']) map[id] = entry['status'];
            }
          }
          setStaffStatuses(map);
          setIsHoliday(!!(json['isHoliday'] as boolean));
        } else {
          setStaffStatuses({});
          setIsHoliday(false);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!controller.signal.aborted) setStaffStatuses({});
      } finally {
        if (!controller.signal.aborted) setFetchingAttendance(false);
      }
    })();

    return () => { controller.abort(); };
  }, [selectedDate, accessToken]);

  // Load monthly summary when month changes
  useEffect(() => {
    if (!accessToken || activeTab !== 'monthly') return;

    monthlyAbortRef.current?.abort();
    const controller = new AbortController();
    monthlyAbortRef.current = controller;

    setMonthlyLoading(true);
    setMonthlyError(null);
    (async () => {
      try {
        const params = new URLSearchParams({ type: 'monthly', month: selectedMonth });
        const res = await fetch(`/api/staff-attendance?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (controller.signal.aborted) return;

        let json: Record<string, unknown> | null = null;
        try { json = await res.json(); } catch { /* non-JSON */ }
        if (controller.signal.aborted) return;

        if (res.ok && json) {
          const items = (json['data'] ?? json['items'] ?? json) as MonthlySummaryItem[];
          setMonthlySummary(Array.isArray(items) ? items : []);
        } else {
          const msg = (json?.['message'] as string) || 'Failed to load monthly summary';
          setMonthlyError(msg);
          setMonthlySummary([]);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setMonthlyError('Network error. Please try again.');
          setMonthlySummary([]);
        }
      } finally {
        if (!controller.signal.aborted) setMonthlyLoading(false);
      }
    })();

    return () => { controller.abort(); };
  }, [selectedMonth, accessToken, activeTab]);

  const navigateMonth = useCallback((delta: number) => {
    setSelectedMonth((prev) => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return toMonthString(d);
    });
  }, []);

  const currentMonthStr = toMonthString(new Date());

  const showTimedError = useCallback((msg: string) => {
    setActionError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
  }, []);

  const handleStatusChange = useCallback(async (staffId: string, status: string) => {
    setActionError(null);
    // Capture previous value before optimistic update
    const prevValue = staffStatuses[staffId];
    setStaffStatuses((prev) => ({ ...prev, [staffId]: status }));

    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ staffId, date: selectedDate, status }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        let msg = 'Failed to update attendance';
        try { const json = await res.json(); msg = json.message || msg; } catch { /* ignore */ }
        setStaffStatuses((curr) => ({ ...curr, [staffId]: prevValue ?? '' }));
        showTimedError(msg);
      }
    } catch {
      setStaffStatuses((curr) => ({ ...curr, [staffId]: prevValue ?? '' }));
      showTimedError('Network error. Please try again.');
    }
  }, [selectedDate, accessToken, staffStatuses, showTimedError]);

  const navigateDate = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      return toISODate(d);
    });
  }, []);

  const activeStaff = staff.filter((s) => s.status === 'ACTIVE');

  const monthlyAggregates = useMemo(() => {
    if (monthlySummary.length === 0) return null;
    const totalPresent = monthlySummary.reduce((sum, item) => sum + item.present, 0);
    const totalAbsent = monthlySummary.reduce((sum, item) => sum + item.absent, 0);
    const totalWorkingDays = monthlySummary.reduce((sum, item) => sum + item.totalWorkingDays, 0);
    const avgAttendance = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;
    return { totalPresent, totalAbsent, avgAttendance };
  }, [monthlySummary]);

  const dailyTab = (
    <>
      {isHoliday && !loading && !fetchingAttendance && (
        <div className={styles.holidayBanner}>
          <span className={styles.holidayBannerText}>This day is marked as a holiday</span>
        </div>
      )}
      {loading || fetchingAttendance ? (
        <Spinner centered size="lg" />
      ) : activeStaff.length === 0 ? (
        <EmptyState message="No active staff members" subtitle="Add staff members first" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Staff Name</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {activeStaff.map((member) => (
              <Tr key={member.id}>
                <Td><span className={styles.staffNameCell}>{member.fullName}</span></Td>
                <Td>
                  <div className={styles.statusToggle}>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${staffStatuses[member.id] === 'PRESENT' ? styles.present : ''}`}
                      onClick={() => handleStatusChange(member.id, 'PRESENT')}
                      aria-pressed={staffStatuses[member.id] === 'PRESENT'}
                      aria-label={`Mark ${member.fullName} as present`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${staffStatuses[member.id] === 'ABSENT' ? styles.absent : ''}`}
                      onClick={() => handleStatusChange(member.id, 'ABSENT')}
                      aria-pressed={staffStatuses[member.id] === 'ABSENT'}
                      aria-label={`Mark ${member.fullName} as absent`}
                    >
                      Absent
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  const monthlyTab = (
    <>
      <div className={styles.monthNav}>
        <button type="button" className={styles.dateNavBtn} onClick={() => navigateMonth(-1)} aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</span>
        <button type="button" className={styles.dateNavBtn} disabled={selectedMonth >= currentMonthStr} onClick={() => navigateMonth(1)} aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <Button variant="outline" size="sm" onClick={() => setSelectedMonth(currentMonthStr)}>This Month</Button>
      </div>

      {monthlyAggregates && !monthlyLoading && (
        <div className={styles.aggregateStats}>
          <div className={styles.aggregateStat}>
            <span className={styles.aggregateLabel}>Avg Attendance:</span>
            <span className={styles.aggregateValue}>{monthlyAggregates.avgAttendance}%</span>
          </div>
          <div className={styles.aggregateStat}>
            <span className={styles.aggregateLabel}>Total Present:</span>
            <span className={`${styles.aggregateValue} ${styles.presentCount}`}>{monthlyAggregates.totalPresent}</span>
          </div>
          <div className={styles.aggregateStat}>
            <span className={styles.aggregateLabel}>Total Absent:</span>
            <span className={`${styles.aggregateValue} ${styles.absentCount}`}>{monthlyAggregates.totalAbsent}</span>
          </div>
        </div>
      )}

      {monthlyError && <Alert variant="error" message={monthlyError} />}

      {monthlyLoading ? (
        <Spinner centered size="lg" />
      ) : monthlySummary.length === 0 && !monthlyError ? (
        <EmptyState message="No attendance data" subtitle="No staff attendance records found for this month." />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Staff Name</Th>
              <Th>Present</Th>
              <Th>Absent</Th>
              <Th>Total Working Days</Th>
            </Tr>
          </Thead>
          <Tbody>
            {monthlySummary.map((item) => (
              <Tr key={item.staffId}>
                <Td><span className={styles.staffNameCell}>{item.staffName}</span></Td>
                <Td><span className={styles.presentCount}>{item.present}</span></Td>
                <Td><span className={styles.absentCount}>{item.absent}</span></Td>
                <Td>{item.totalWorkingDays}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Staff Attendance</h1>
      </div>

      {error && <Alert variant="error" message={error} />}
      {actionError && <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />}

      {/* Date Navigation */}
      <div className={styles.dateNav}>
        <button type="button" className={styles.dateNavBtn} onClick={() => navigateDate(-1)} aria-label="Previous day">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.dateLabel}>{formatDateLabel(selectedDate)}</span>
        <button type="button" className={styles.dateNavBtn} disabled={selectedDate >= today} onClick={() => navigateDate(1)} aria-label="Next day">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>Today</Button>
      </div>

      <Tabs
        items={[
          { key: 'daily', label: 'Daily', content: dailyTab },
          { key: 'monthly', label: 'Monthly Summary', content: monthlyTab },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
}
