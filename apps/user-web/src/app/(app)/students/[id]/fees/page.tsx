'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudentDetail } from '@/application/students/use-students';
import { useStudentFees, markFeePaid } from '@/application/fees/use-fees';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function statusVariant(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID': return 'success' as const;
    case 'DUE': return 'danger' as const;
    case 'OVERDUE': return 'danger' as const;
    case 'UPCOMING': return 'info' as const;
    default: return 'default' as const;
  }
}

export default function StudentFeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const isStaff = user?.role === 'STAFF';

  const { data: student, loading: studentLoading } = useStudentDetail(params.id);
  const { data: fees, loading: feesLoading, error: feesError, refetch } = useStudentFees(params.id);

  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const handleMarkPaid = useCallback(async (monthKey: string) => {
    if (!params.id) return;
    const method = paymentMethods[monthKey];
    if (!method) {
      setPaymentMethodError(monthKey);
      return;
    }
    setPaymentMethodError(null);
    setMarkPaidError(null);
    setMarkingPaid(monthKey);
    const result = await markFeePaid(params.id, monthKey, method, accessToken);
    setMarkingPaid(null);
    if (!result.ok) {
      setMarkPaidError(result.error || 'Failed to mark fee as paid');
      return;
    }
    refetch();
  }, [params.id, paymentMethods, accessToken, refetch]);

  const loading = studentLoading || feesLoading;

  if (loading) return <Spinner centered size="lg" />;

  return (
    <div className={styles.page}>
      {/* Back */}
      <button type="button" className={styles.backButton} onClick={() => router.push(`/students/${params.id}`)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Student
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fee Details</h1>
          {student && <p className={styles.subtitle}>{student.fullName}</p>}
        </div>
        {isStaff && (
          <Button variant="primary" size="sm" onClick={() => router.push('/fees?tab=my-requests')}>
            Payment Requests
          </Button>
        )}
      </div>

      {/* Errors */}
      {feesError && <Alert variant="error" message={feesError} action={{ label: 'Retry', onClick: refetch }} />}
      {markPaidError && <Alert variant="error" message={markPaidError} />}

      {/* Fee Table */}
      {fees.length === 0 ? (
        <EmptyState message="No fee records found" subtitle="Fee dues will appear here once they are generated." />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Month</Th>
              <Th>Due Amount</Th>
              <Th>Late Fee</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              {(isOwner || isStaff) && <Th>Action</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {fees.map((fee) => {
              const feeStatus = fee.status?.toUpperCase() ?? 'DUE';
              const isDue = feeStatus === 'DUE' || feeStatus === 'OVERDUE';
              return (
                <Tr key={fee.id}>
                  <Td>{getMonthLabel(fee.monthKey)}</Td>
                  <Td className={styles.amount}>{formatCurrency(fee.amount)}</Td>
                  <Td style={{ color: fee.lateFee > 0 ? 'var(--color-danger)' : undefined }}>
                    {fee.lateFee > 0 ? formatCurrency(fee.lateFee) : '-'}
                  </Td>
                  <Td className={isDue ? styles.amountDue : feeStatus === 'PAID' ? styles.amountPaid : styles.amount}>
                    {formatCurrency(fee.totalPayable)}
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(feeStatus)}>{feeStatus}</Badge>
                  </Td>
                  {(isOwner || isStaff) && (
                    <Td>
                      {isOwner && isDue && (
                        <>
                          <div className={styles.actionCell}>
                            <Select
                              options={PAYMENT_METHODS}
                              value={paymentMethods[fee.monthKey] ?? ''}
                              onChange={(e) => {
                                setPaymentMethods((prev) => ({ ...prev, [fee.monthKey]: e.target.value }));
                                setPaymentMethodError(null);
                              }}
                              className={styles.paymentMethodSelect}
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              loading={markingPaid === fee.monthKey}
                              onClick={() => handleMarkPaid(fee.monthKey)}
                            >
                              Mark Paid
                            </Button>
                          </div>
                          {paymentMethodError === fee.monthKey && (
                            <span className={styles.paymentMethodError}>Please select a payment method</span>
                          )}
                        </>
                      )}
                      {isStaff && isDue && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/fees?tab=my-requests')}
                        >
                          Request Payment
                        </Button>
                      )}
                      {feeStatus === 'PAID' && fee.paidAt && (
                        <span className={styles.paidDate}>
                          {new Date(fee.paidAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </span>
                      )}
                    </Td>
                  )}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
