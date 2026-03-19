'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useStaff } from '@/application/staff/use-staff';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
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
  return d.toLocaleDateString('en-CA');
}

export default function StaffAttendancePage() {
  const { accessToken } = useAuth();
  const today = toISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState('daily');

  const { data: staff, loading, error } = useStaff();

  const [actionError, setActionError] = useState<string | null>(null);

  // Local attendance state for staff
  const [staffStatuses, setStaffStatuses] = useState<Record<string, string>>({});

  // Load existing staff attendance data when date changes
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(`/api/staff-attendance?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const entries = json.data ?? json.items ?? json ?? [];
          const map: Record<string, string> = {};
          for (const entry of entries) {
            if (entry.staffId && entry.status) {
              map[entry.staffId] = entry.status;
            } else if (entry.staffUserId && entry.status) {
              map[entry.staffUserId] = entry.status;
            }
          }
          setStaffStatuses(map);
        } else {
          setStaffStatuses({});
        }
      } catch {
        if (!cancelled) setStaffStatuses({});
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, accessToken]);

  const handleStatusChange = useCallback(async (staffId: string, status: string) => {
    const prevStatuses = staffStatuses;
    setStaffStatuses((prev) => ({ ...prev, [staffId]: status }));
    // Call staff attendance API
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ staffId, date: selectedDate, status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ message: 'Failed to update attendance' }));
        setStaffStatuses(prevStatuses);
        setActionError(json.message || 'Failed to update attendance');
        setTimeout(() => setActionError(null), 5000);
      }
    } catch {
      setStaffStatuses(prevStatuses);
      setActionError('Network error. Please try again.');
      setTimeout(() => setActionError(null), 5000);
    }
  }, [selectedDate, accessToken, staffStatuses]);

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toISODate(d));
  };

  const dailyTab = (
    <>
      {loading ? (
        <Spinner centered size="lg" />
      ) : staff.length === 0 ? (
        <EmptyState message="No staff members" subtitle="Add staff members first" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Staff Name</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {staff.filter((s) => s.status === 'ACTIVE').map((member) => (
              <Tr key={member.id}>
                <Td style={{ fontWeight: 500 }}>{member.fullName}</Td>
                <Td>
                  <div className={styles.statusToggle}>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${staffStatuses[member.id] === 'PRESENT' ? styles.present : ''}`}
                      onClick={() => handleStatusChange(member.id, 'PRESENT')}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${staffStatuses[member.id] === 'ABSENT' ? styles.absent : ''}`}
                      onClick={() => handleStatusChange(member.id, 'ABSENT')}
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
    <EmptyState message="Monthly summary coming soon" subtitle="Staff monthly attendance summary is under development." />
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
        <button type="button" className={styles.dateNavBtn} onClick={() => navigateDate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.dateLabel}>{formatDateLabel(selectedDate)}</span>
        <button type="button" className={styles.dateNavBtn} disabled={selectedDate >= today} style={selectedDate >= today ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => navigateDate(1)}>
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
