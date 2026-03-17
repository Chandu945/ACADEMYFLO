'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useDailyAttendance, markAttendance, markBulkAttendance, useMonthlySummary, useMonthDailyCounts } from '@/application/attendance/use-attendance';
import { useBatches } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

function formatDateLabel(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AttendancePage() {
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const today = useMemo(() => toISODate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [batchId, setBatchId] = useState('');
  const [activeTab, setActiveTab] = useState('mark');

  const currentMonth = selectedDate.slice(0, 7);

  const { data: attendance, loading, error, refetch } = useDailyAttendance(selectedDate, batchId || undefined);
  const { data: batches } = useBatches();
  const { data: monthlySummary, loading: summaryLoading } = useMonthlySummary(currentMonth);
  const { data: dailyCounts, loading: dailyLoading } = useMonthDailyCounts(currentMonth);

  const batchOptions = [
    { value: '', label: 'All Batches' },
    ...batches.map((b) => ({ value: b.id, label: b.batchName })),
  ];

  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // When attendance data loads, reset local overrides
  React.useEffect(() => {
    if (attendance?.items) {
      const map: Record<string, string> = {};
      attendance.items.forEach((item) => { map[item.studentId] = item.status; });
      setLocalStatuses(map);
    }
  }, [attendance]);

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toISODate(d));
  };

  const handleStatusChange = useCallback(async (studentId: string, status: string) => {
    setLocalStatuses((prev) => ({ ...prev, [studentId]: status }));
    await markAttendance(studentId, selectedDate, status, accessToken);
  }, [selectedDate, accessToken]);

  const handleBulk = useCallback(async (status: string) => {
    if (!attendance?.items) return;
    const updates = attendance.items.map((item) => ({ studentId: item.studentId, status }));
    setLocalStatuses((prev) => {
      const n = { ...prev };
      updates.forEach((u) => { n[u.studentId] = u.status; });
      return n;
    });
    await markBulkAttendance(selectedDate, updates, accessToken);
    refetch();
  }, [attendance, selectedDate, accessToken, refetch]);

  const handleDeclareHoliday = useCallback(async () => {
    if (!attendance?.items) return;
    const updates = attendance.items.map((item) => ({ studentId: item.studentId, status: 'HOLIDAY' }));
    await markBulkAttendance(selectedDate, updates, accessToken);
    refetch();
  }, [attendance, selectedDate, accessToken, refetch]);

  const markAttendanceTab = (
    <>
      {/* Holiday Banner */}
      {attendance?.isHoliday && (
        <div className={styles.holidayBanner}>
          <span className={styles.holidayBannerText}>This day is marked as a holiday</span>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => handleBulk('ABSENT')}>
              Remove Holiday
            </Button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <Select
          options={batchOptions}
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        />
        <div className={styles.bulkActions}>
          <Button variant="outline" size="sm" onClick={() => handleBulk('PRESENT')}>
            Mark All Present
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulk('ABSENT')}>
            Mark All Absent
          </Button>
          {isOwner && !attendance?.isHoliday && (
            <Button variant="secondary" size="sm" onClick={handleDeclareHoliday}>
              Declare Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Error / Loading */}
      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {loading ? (
        <Spinner centered size="lg" />
      ) : !attendance?.items?.length ? (
        <EmptyState message="No students found" subtitle="Try selecting a different batch or date" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student Name</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {attendance.items.map((item) => (
              <Tr key={item.studentId}>
                <Td>{item.fullName}</Td>
                <Td>
                  <div className={styles.statusToggle}>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${localStatuses[item.studentId] === 'PRESENT' ? styles.present : ''}`}
                      onClick={() => handleStatusChange(item.studentId, 'PRESENT')}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${localStatuses[item.studentId] === 'ABSENT' ? styles.absent : ''}`}
                      onClick={() => handleStatusChange(item.studentId, 'ABSENT')}
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

  const dailyReportTab = (
    <>
      {dailyLoading ? (
        <Spinner centered size="lg" />
      ) : dailyCounts.length === 0 ? (
        <EmptyState message="No data for this month" />
      ) : (
        <Table striped compact>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Present</Th>
              <Th>Absent</Th>
              <Th>Holiday</Th>
            </Tr>
          </Thead>
          <Tbody>
            {dailyCounts.map((day) => (
              <Tr key={day.date}>
                <Td>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</Td>
                <Td style={{ color: 'var(--color-success)' }}>{day.presentCount}</Td>
                <Td style={{ color: 'var(--color-danger)' }}>{day.absentCount}</Td>
                <Td>{day.isHoliday ? 'Yes' : '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  const monthlySummaryTab = (
    <>
      {summaryLoading ? (
        <Spinner centered size="lg" />
      ) : monthlySummary.length === 0 ? (
        <EmptyState message="No attendance data for this month" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Present</Th>
              <Th>Absent</Th>
              <Th>Holiday</Th>
            </Tr>
          </Thead>
          <Tbody>
            {monthlySummary.map((s) => (
              <Tr key={s.studentId}>
                <Td>{s.fullName}</Td>
                <Td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{s.presentCount}</Td>
                <Td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{s.absentCount}</Td>
                <Td>{s.holidayCount}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Attendance</h1>
      </div>

      {/* Date Navigation */}
      <div className={styles.dateNav}>
        <button type="button" className={styles.dateNavBtn} onClick={() => navigateDate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.dateLabel}>{formatDateLabel(selectedDate)}</span>
        <button type="button" className={styles.dateNavBtn} onClick={() => navigateDate(1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>Today</Button>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          { key: 'mark', label: 'Mark Attendance', content: markAttendanceTab },
          { key: 'daily', label: 'Daily Report', content: dailyReportTab },
          { key: 'monthly', label: 'Monthly Summary', content: monthlySummaryTab },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
}
