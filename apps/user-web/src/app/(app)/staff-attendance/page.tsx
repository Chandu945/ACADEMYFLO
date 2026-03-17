'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  return d.toISOString().split('T')[0];
}

export default function StaffAttendancePage() {
  const { accessToken } = useAuth();
  const today = useMemo(() => toISODate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState('daily');

  const { data: staff, loading, error } = useStaff();

  // Local attendance state for staff
  const [staffStatuses, setStaffStatuses] = useState<Record<string, string>>({});

  const handleStatusChange = useCallback(async (staffId: string, status: string) => {
    setStaffStatuses((prev) => ({ ...prev, [staffId]: status }));
    // Call staff attendance API
    try {
      await fetch('/api/staff-attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ staffId, date: selectedDate, status }),
      });
    } catch {
      // Silently handle
    }
  }, [selectedDate, accessToken]);

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
    <>
      {loading ? (
        <Spinner centered size="lg" />
      ) : staff.length === 0 ? (
        <EmptyState message="No staff members" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Staff Name</Th>
              <Th>Present</Th>
              <Th>Absent</Th>
              <Th>Holiday</Th>
            </Tr>
          </Thead>
          <Tbody>
            {staff.filter((s) => s.status === 'ACTIVE').map((member) => (
              <Tr key={member.id}>
                <Td style={{ fontWeight: 500 }}>{member.fullName}</Td>
                <Td style={{ color: 'var(--color-success)', fontWeight: 600 }}>-</Td>
                <Td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>-</Td>
                <Td>-</Td>
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
