'use client';

import React, { useState, useMemo } from 'react';
import { useFeeDues, usePaidFees } from '@/application/fees/use-fees';
import { useDashboardKpis } from '@/application/dashboard/use-dashboard';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTab, setActiveTab] = useState('revenue');

  const month = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [now, monthOffset]);

  const { data: kpis, loading: kpisLoading } = useDashboardKpis();
  const { data: dues, loading: duesLoading } = useFeeDues(month);
  const { data: paidFees, loading: paidLoading } = usePaidFees(month);

  const totalCollected = paidFees.reduce((acc, f) => acc + f.amount, 0);
  const totalPending = dues.filter((d) => d.status !== 'PAID').reduce((acc, d) => acc + d.totalPayable, 0);

  const revenueTab = (
    <>
      <div className={styles.revenueCards}>
        <div className={`${styles.revenueCard} ${styles.collected}`}>
          <div className={styles.revenueLabel}>Collected</div>
          <div className={styles.revenueValue}>{formatCurrency(totalCollected)}</div>
        </div>
        <div className={`${styles.revenueCard} ${styles.pending}`}>
          <div className={styles.revenueLabel}>Pending</div>
          <div className={styles.revenueValue}>{formatCurrency(totalPending)}</div>
        </div>
        <div className={`${styles.revenueCard} ${styles.total}`}>
          <div className={styles.revenueLabel}>Total Students</div>
          <div className={styles.revenueValue}>{kpisLoading ? '-' : kpis?.totalActiveStudents ?? 0}</div>
        </div>
      </div>
    </>
  );

  const studentDuesTab = (
    <>
      {duesLoading ? (
        <Spinner centered size="lg" />
      ) : dues.length === 0 ? (
        <EmptyState message="No dues data for this month" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Fee</Th>
              <Th>Due Amount</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {dues.map((due) => (
              <Tr key={due.id}>
                <Td style={{ fontWeight: 500 }}>{due.studentName ?? '-'}</Td>
                <Td>{formatCurrency(due.amount)}</Td>
                <Td style={{ fontWeight: 600, color: due.status === 'PAID' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {formatCurrency(due.totalPayable)}
                </Td>
                <Td>
                  <Badge variant={due.status === 'PAID' ? 'success' : due.status === 'OVERDUE' ? 'danger' : 'warning'} dot>
                    {due.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  const monthDuesTab = (
    <>
      {paidLoading ? (
        <Spinner centered size="lg" />
      ) : paidFees.length === 0 && dues.length === 0 ? (
        <EmptyState message="No fee data for this month" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Paid Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...paidFees, ...dues.filter((d) => d.status !== 'PAID')].map((fee) => (
              <Tr key={fee.id}>
                <Td style={{ fontWeight: 500 }}>{fee.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(fee.monthKey)}</Td>
                <Td style={{ fontWeight: 600 }}>{formatCurrency(fee.amount)}</Td>
                <Td>
                  <Badge variant={fee.status === 'PAID' ? 'success' : 'warning'} dot>{fee.status}</Badge>
                </Td>
                <Td>
                  {fee.paidAt
                    ? new Date(fee.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '-'}
                </Td>
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
        <h1 className={styles.title}>Reports</h1>
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.monthLabel}>{getMonthLabel(month)}</span>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      <Tabs
        items={[
          { key: 'revenue', label: 'Revenue', content: revenueTab },
          { key: 'student-dues', label: 'Student-wise Dues', content: studentDuesTab },
          { key: 'month-dues', label: 'Month-wise Dues', content: monthDuesTab },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
}
