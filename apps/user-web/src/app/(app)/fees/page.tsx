'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useFeeDues, usePaidFees, usePaymentRequests, markFeePaid, handlePaymentRequest } from '@/application/fees/use-fees';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

const PAYMENT_METHODS = [
  { value: '', label: 'Payment Method' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function FeesPage() {
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const now = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTab, setActiveTab] = useState('unpaid');

  const month = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [now, monthOffset]);

  const monthLabel = getMonthLabel(month);

  const { data: dues, loading: duesLoading, error: duesError, refetch: refetchDues } = useFeeDues(month);
  const { data: paidFees, loading: paidLoading } = usePaidFees(month);
  const { data: requests, loading: requestsLoading, refetch: refetchRequests } = usePaymentRequests();

  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleMarkPaid = useCallback(async (studentId: string, monthKey: string) => {
    const method = paymentMethods[`${studentId}-${monthKey}`];
    if (!method) return;
    setMarkingPaid(`${studentId}-${monthKey}`);
    const result = await markFeePaid(studentId, monthKey, method, accessToken);
    setMarkingPaid(null);
    if (result.ok) refetchDues();
  }, [paymentMethods, accessToken, refetchDues]);

  const handleRequest = useCallback(async (requestId: string, action: string) => {
    setActionLoading(requestId);
    await handlePaymentRequest(requestId, action, undefined, accessToken);
    setActionLoading(null);
    refetchRequests();
  }, [accessToken, refetchRequests]);

  const unpaidTab = (
    <>
      {duesError && <Alert variant="error" message={duesError} action={{ label: 'Retry', onClick: refetchDues }} />}
      {duesLoading ? (
        <Spinner centered size="lg" />
      ) : dues.filter((d) => d.status !== 'PAID').length === 0 ? (
        <EmptyState message="No unpaid dues" subtitle={`All fees are cleared for ${monthLabel}`} />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Late Fee</Th>
              <Th>Total</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {dues.filter((d) => d.status !== 'PAID').map((due) => (
              <Tr key={due.id}>
                <Td>{due.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(due.monthKey)}</Td>
                <Td className={styles.amount}>{formatCurrency(due.amount)}</Td>
                <Td style={{ color: due.lateFee > 0 ? 'var(--color-danger)' : undefined }}>{due.lateFee > 0 ? formatCurrency(due.lateFee) : '-'}</Td>
                <Td className={styles.amountDue}>{formatCurrency(due.totalPayable)}</Td>
                <Td>
                  <div className={styles.actionCell}>
                    <Select
                      options={PAYMENT_METHODS}
                      value={paymentMethods[`${due.studentId}-${due.monthKey}`] ?? ''}
                      onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [`${due.studentId}-${due.monthKey}`]: e.target.value }))}
                      className={styles.paymentMethodSelect}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={markingPaid === `${due.studentId}-${due.monthKey}`}
                      disabled={!paymentMethods[`${due.studentId}-${due.monthKey}`]}
                      onClick={() => handleMarkPaid(due.studentId, due.monthKey)}
                    >
                      Mark Paid
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  const paidTab = (
    <>
      {paidLoading ? (
        <Spinner centered size="lg" />
      ) : paidFees.length === 0 ? (
        <EmptyState message="No paid fees this month" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Paid Date</Th>
              <Th>Source</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paidFees.map((fee) => (
              <Tr key={fee.id}>
                <Td>{fee.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(fee.monthKey)}</Td>
                <Td className={styles.amountPaid}>{formatCurrency(fee.amount)}</Td>
                <Td>{fee.paidAt ? new Date(fee.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</Td>
                <Td><Badge variant="info">{fee.paidSource ?? fee.paymentLabel ?? '-'}</Badge></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  const requestsTab = (
    <>
      {requestsLoading ? (
        <Spinner centered size="lg" />
      ) : requests.length === 0 ? (
        <EmptyState message="No payment requests" />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Submitted By</Th>
              <Th>Status</Th>
              {isOwner && <Th>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {requests.map((req) => (
              <Tr key={req.id}>
                <Td>{req.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(req.monthKey)}</Td>
                <Td className={styles.amount}>{formatCurrency(req.amount)}</Td>
                <Td>{req.staffName ?? '-'}</Td>
                <Td>
                  <Badge
                    variant={
                      req.status === 'APPROVED' ? 'success' :
                      req.status === 'REJECTED' ? 'danger' :
                      'warning'
                    }
                  >
                    {req.status}
                  </Badge>
                </Td>
                {isOwner && (
                  <Td>
                    {req.status === 'PENDING' && (
                      <div className={styles.requestActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionLoading === req.id}
                          onClick={() => handleRequest(req.id, 'APPROVE')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={actionLoading === req.id}
                          onClick={() => handleRequest(req.id, 'REJECT')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </Td>
                )}
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
        <h1 className={styles.title}>Fees Management</h1>
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          { key: 'unpaid', label: 'Unpaid Dues', content: unpaidTab },
          { key: 'paid', label: 'Paid', content: paidTab },
          { key: 'requests', label: 'Payment Requests', content: requestsTab },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
}
