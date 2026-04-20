'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDailyAttendance, markAttendance, markBulkAttendance, useMonthlySummary, useMonthDailyCounts, removeHoliday } from '@/application/attendance/use-attendance';
import { useBatches } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import styles from './page.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  if (!m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[dayOfWeek]}, ${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}

function toISODate(d: Date) {
  // Always IST so today / navigated dates are stable regardless of device TZ.
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function AttendancePage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const today = toISODate(new Date());
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
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; label: string } | null>(null);

  // Task 3: Search state for mark attendance tab
  const [markSearch, setMarkSearch] = useState('');

  // Task 4: Expanded rows state for daily report tab
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedAbsent, setExpandedAbsent] = useState<{ fullName: string }[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Filtered attendance items based on search
  const filteredAttendanceItems = useMemo(() => {
    if (!attendance?.data) return [];
    if (!markSearch.trim()) return attendance.data;
    const q = markSearch.trim().toLowerCase();
    return attendance.data.filter((item) => item.fullName.toLowerCase().includes(q));
  }, [attendance?.data, markSearch]);

  // When attendance data loads, reset local overrides
  React.useEffect(() => {
    if (attendance?.data) {
      const map: Record<string, string> = {};
      attendance.data.forEach((item) => { map[item.studentId] = item.status; });
      setLocalStatuses(map);
    }
  }, [attendance]);

  const navigateDate = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      return toISODate(d);
    });
  }, []);

  const handleStatusChange = useCallback(async (studentId: string, status: string) => {
    const previousStatus = localStatuses[studentId];
    setLocalStatuses((prev) => ({ ...prev, [studentId]: status }));
    setAttendanceError(null);
    const result = await markAttendance(studentId, selectedDate, status, accessToken);
    if (!result.ok) {
      setLocalStatuses((prev) => ({ ...prev, [studentId]: previousStatus }));
      setAttendanceError(result.error || 'Failed to mark attendance');
    }
  }, [selectedDate, accessToken, localStatuses]);

  const handleBulk = useCallback(async (status: string) => {
    if (!attendance?.data) return;
    setBulkLoading(true);
    setAttendanceError(null);
    const previousStatuses = { ...localStatuses };
    const updates = attendance.data.map((item) => ({ studentId: item.studentId, status }));
    setLocalStatuses((prev) => {
      const n = { ...prev };
      updates.forEach((u) => { n[u.studentId] = u.status; });
      return n;
    });
    const result = await markBulkAttendance(selectedDate, updates, accessToken);
    setBulkLoading(false);
    if (!result.ok) {
      setLocalStatuses(previousStatuses);
      setAttendanceError(result.error || 'Failed to mark bulk attendance');
      return;
    }
    refetch();
  }, [attendance, selectedDate, accessToken, refetch, localStatuses]);

  const handleDeclareHoliday = useCallback(async () => {
    if (!attendance?.data) return;
    setBulkLoading(true);
    setAttendanceError(null);
    const updates = attendance.data.map((item) => ({ studentId: item.studentId, status: 'HOLIDAY' }));
    const result = await markBulkAttendance(selectedDate, updates, accessToken);
    setBulkLoading(false);
    if (!result.ok) {
      setAttendanceError(result.error || 'Failed to declare holiday');
      return;
    }
    refetch();
  }, [attendance, selectedDate, accessToken, refetch]);

  // Task 2: Remove holiday via DELETE endpoint instead of bulk-marking ABSENT
  const handleRemoveHoliday = useCallback(async () => {
    setBulkLoading(true);
    setAttendanceError(null);
    const result = await removeHoliday(selectedDate, accessToken);
    setBulkLoading(false);
    if (!result.ok) {
      setAttendanceError(result.error || 'Failed to remove holiday');
      return;
    }
    refetch();
  }, [selectedDate, accessToken, refetch]);

  const handleBulkConfirm = useCallback(async () => {
    if (!bulkConfirm) return;
    if (bulkConfirm.action === 'HOLIDAY') {
      await handleDeclareHoliday();
    } else if (bulkConfirm.action === 'REMOVE_HOLIDAY') {
      await handleRemoveHoliday();
    } else {
      await handleBulk(bulkConfirm.action);
    }
    setBulkConfirm(null);
  }, [bulkConfirm, handleBulk, handleDeclareHoliday, handleRemoveHoliday]);

  // Task 4: Expand daily report row to show absent student names
  const handleExpandDailyRow = useCallback(async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      setExpandedAbsent([]);
      return;
    }
    setExpandedDate(date);
    setExpandedLoading(true);
    setExpandedAbsent([]);
    try {
      const params = new URLSearchParams({ date, pageSize: '100' });
      const res = await fetch(`/api/attendance?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const items = (json?.items ?? []) as { fullName: string; status: string }[];
        setExpandedAbsent(items.filter((i) => i.status === 'ABSENT').map((i) => ({ fullName: i.fullName })));
      }
    } catch {
      // silently fail — row just won't show names
    } finally {
      setExpandedLoading(false);
    }
  }, [expandedDate, accessToken]);

  const markAttendanceTab = (
    <>
      {/* Holiday Banner */}
      {attendance?.isHoliday && (
        <div className={styles.holidayBanner}>
          <span className={styles.holidayBannerText}>This day is marked as a holiday</span>
          {isOwner && (
            <Button variant="outline" size="sm" disabled={bulkLoading} onClick={() => setBulkConfirm({ action: 'REMOVE_HOLIDAY', label: 'Remove Holiday' })}>
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
          <Button variant="outline" size="sm" disabled={bulkLoading} onClick={() => setBulkConfirm({ action: 'PRESENT', label: 'Mark All Present' })}>
            Mark All Present
          </Button>
          <Button variant="outline" size="sm" disabled={bulkLoading} onClick={() => setBulkConfirm({ action: 'ABSENT', label: 'Mark All Absent' })}>
            Mark All Absent
          </Button>
          {isOwner && !attendance?.isHoliday && (
            <Button variant="secondary" size="sm" disabled={bulkLoading} onClick={() => setBulkConfirm({ action: 'HOLIDAY', label: 'Declare Holiday' })}>
              Declare Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <SearchInput
        value={markSearch}
        onChange={setMarkSearch}
        placeholder="Search students..."
        label="Search students"
        debounceMs={200}
      />

      {/* Error / Loading */}
      {attendanceError && <Alert variant="error" message={attendanceError} />}
      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: refetch }} />}

      {loading ? (
        <Spinner centered size="lg" />
      ) : !attendance?.data?.length ? (
        <EmptyState message="No students found" subtitle="Try selecting a different batch or date" />
      ) : filteredAttendanceItems.length === 0 ? (
        <EmptyState message="No matching students" subtitle="Try a different search term" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student Name</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredAttendanceItems.map((item) => (
              <Tr key={item.studentId}>
                <Td>{item.fullName}</Td>
                <Td>
                  <div className={styles.statusToggle}>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${localStatuses[item.studentId] === 'PRESENT' ? styles.present : ''}`}
                      onClick={() => handleStatusChange(item.studentId, 'PRESENT')}
                      aria-pressed={localStatuses[item.studentId] === 'PRESENT'}
                      aria-label={`Mark ${item.fullName} as present`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${localStatuses[item.studentId] === 'ABSENT' ? styles.absent : ''}`}
                      onClick={() => handleStatusChange(item.studentId, 'ABSENT')}
                      aria-pressed={localStatuses[item.studentId] === 'ABSENT'}
                      aria-label={`Mark ${item.fullName} as absent`}
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
              <React.Fragment key={day.date}>
                <Tr
                  clickable={day.absentCount > 0}
                  className={day.absentCount > 0 ? styles.clickableRow : undefined}
                  onClick={day.absentCount > 0 ? () => handleExpandDailyRow(day.date) : undefined}
                >
                  <Td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {day.absentCount > 0 && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transition: 'transform 0.2s',
                            transform: expandedDate === day.date ? 'rotate(90deg)' : 'rotate(0deg)',
                            flexShrink: 0,
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                      {formatShortDate(day.date)}
                    </span>
                  </Td>
                  <Td style={{ color: 'var(--color-success)' }}>{day.presentCount}</Td>
                  <Td style={{ color: 'var(--color-danger)' }}>{day.absentCount}</Td>
                  <Td>{day.isHoliday ? 'Yes' : '-'}</Td>
                </Tr>
                {expandedDate === day.date && (
                  <Tr>
                    <Td colSpan={4}>
                      <div className={styles.expandedAbsent}>
                        {expandedLoading ? (
                          <Spinner size="sm" />
                        ) : expandedAbsent.length === 0 ? (
                          <span className={styles.expandedEmpty}>No absent students</span>
                        ) : (
                          <div className={styles.absentList}>
                            <span className={styles.absentListLabel}>Absent:</span>
                            {expandedAbsent.map((s, i) => (
                              <Badge key={i} variant="danger">{s.fullName}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
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
              <Tr
                key={s.studentId}
                clickable
                className={styles.clickableRow}
                onClick={() => router.push(`/attendance/student/${s.studentId}?name=${encodeURIComponent(s.fullName)}&month=${currentMonth}`)}
              >
                <Td>
                  <span className={styles.studentLink}>{s.fullName}</span>
                </Td>
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
        <button type="button" className={styles.dateNavBtn} disabled={selectedDate >= today} onClick={() => navigateDate(1)}>
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

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={handleBulkConfirm}
        title={bulkConfirm?.label ?? 'Confirm Action'}
        message={`Are you sure you want to "${bulkConfirm?.label?.toLowerCase()}" for all students on ${formatDateLabel(selectedDate)}?`}
        confirmLabel={bulkConfirm?.label ?? 'Confirm'}
        danger={bulkConfirm?.action === 'ABSENT' || bulkConfirm?.action === 'REMOVE_HOLIDAY'}
        loading={bulkLoading}
      />
    </div>
  );
}
