'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFeeDues, usePaidFees, usePaymentRequests, markFeePaid, handlePaymentRequest } from '@/application/fees/use-fees';
import { useBatches } from '@/application/batches/use-batches';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { TextArea } from '@/components/ui/TextArea';
import styles from './page.module.css';

const PAYMENT_METHODS = [
  { value: '', label: 'Payment Method' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
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

export default function FeesPage() {
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const isStaff = user?.role === 'STAFF';
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'my-requests' ? 'my-requests' : 'unpaid';
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Search & batch filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const { data: batches } = useBatches();

  const batchOptions = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.batchName })),
    [batches],
  );

  const month = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const monthLabel = getMonthLabel(month);

  const { data: dues, loading: duesLoading, error: duesError, refetch: refetchDues } = useFeeDues(month, 1, selectedBatchId || undefined);
  const { data: paidFees, loading: paidLoading } = usePaidFees(month, selectedBatchId || undefined);
  const { data: requests, loading: requestsLoading, refetch: refetchRequests } = usePaymentRequests();

  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ id: string; studentName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);

  // Filter helper
  const matchesSearch = useCallback((studentName: string | null) => {
    if (!searchQuery.trim()) return true;
    return (studentName ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase());
  }, [searchQuery]);

  const handleMarkPaid = useCallback(async (studentId: string, monthKey: string) => {
    const method = paymentMethods[`${studentId}-${monthKey}`];
    if (!method) {
      setPaymentMethodError(`${studentId}-${monthKey}`);
      return;
    }
    setPaymentMethodError(null);
    setMarkPaidError(null);
    setMarkingPaid(`${studentId}-${monthKey}`);
    const result = await markFeePaid(studentId, monthKey, method, accessToken);
    setMarkingPaid(null);
    if (!result.ok) {
      setMarkPaidError(result.error || 'Failed to mark fee as paid');
      return;
    }
    refetchDues();
  }, [paymentMethods, accessToken, refetchDues]);

  const handleRequest = useCallback(async (requestId: string, action: string, reason?: string) => {
    setActionLoading({ id: requestId, action });
    setActionError(null);
    const extraData = action === 'REJECT' && reason ? { rejectionReason: reason } : undefined;
    const result = await handlePaymentRequest(requestId, action, extraData, accessToken);
    setActionLoading(null);
    if (!result.ok) {
      setActionError(result.error || `Failed to ${action.toLowerCase()} payment request`);
      return;
    }
    refetchRequests();
  }, [accessToken, refetchRequests]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectConfirm) return;
    if (rejectionReason.trim().length < 3) {
      setRejectionReasonError('Rejection reason must be at least 3 characters');
      return;
    }
    setRejectionReasonError(null);
    await handleRequest(rejectConfirm.id, 'REJECT', rejectionReason.trim());
    setRejectConfirm(null);
    setRejectionReason('');
  }, [rejectConfirm, handleRequest, rejectionReason]);

  const handleRejectClose = useCallback(() => {
    setRejectConfirm(null);
    setRejectionReason('');
    setRejectionReasonError(null);
  }, []);

  // Filtered data
  const filteredDues = useMemo(
    () => dues.filter((d) => d.status !== 'PAID').filter((d) => matchesSearch(d.studentName)),
    [dues, matchesSearch],
  );

  const filteredPaidFees = useMemo(
    () => paidFees.filter((fee) => matchesSearch(fee.studentName)),
    [paidFees, matchesSearch],
  );

  const filteredRequests = useMemo(
    () => requests.filter((req) => matchesSearch(req.studentName)),
    [requests, matchesSearch],
  );

  const unpaidTab = (
    <>
      {duesError && <Alert variant="error" message={duesError} action={{ label: 'Retry', onClick: refetchDues }} />}
      {markPaidError && <Alert variant="error" message={markPaidError} />}
      {duesLoading ? (
        <Spinner centered size="lg" />
      ) : filteredDues.length === 0 ? (
        <EmptyState message="No unpaid dues" subtitle={searchQuery ? 'Try a different search' : `All fees are cleared for ${monthLabel}`} />
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
            {filteredDues.map((due) => (
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
                      onChange={(e) => { setPaymentMethods((prev) => ({ ...prev, [`${due.studentId}-${due.monthKey}`]: e.target.value })); setPaymentMethodError(null); }}
                      className={styles.paymentMethodSelect}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={markingPaid === `${due.studentId}-${due.monthKey}`}
                      onClick={() => handleMarkPaid(due.studentId, due.monthKey)}
                    >
                      Mark Paid
                    </Button>
                  </div>
                  {paymentMethodError === `${due.studentId}-${due.monthKey}` && (
                    <span className={styles.paymentMethodError}>Please select a payment method</span>
                  )}
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
      ) : filteredPaidFees.length === 0 ? (
        <EmptyState message="No paid fees this month" subtitle={searchQuery ? 'Try a different search' : undefined} />
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
            {filteredPaidFees.map((fee) => (
              <Tr key={fee.id}>
                <Td>{fee.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(fee.monthKey)}</Td>
                <Td className={styles.amountPaid}>{formatCurrency(fee.amount)}</Td>
                <Td>{fee.paidAt ? new Date(fee.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '-'}</Td>
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
      {actionError && <Alert variant="error" message={actionError} />}
      {requestsLoading ? (
        <Spinner centered size="lg" />
      ) : filteredRequests.length === 0 ? (
        <EmptyState message="No payment requests" subtitle={searchQuery ? 'Try a different search' : undefined} />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Submitted By</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
              {isOwner && <Th>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {filteredRequests.map((req) => (
              <React.Fragment key={req.id}>
                <Tr>
                  <Td>{req.studentName ?? '-'}</Td>
                  <Td>{getMonthLabel(req.monthKey)}</Td>
                  <Td className={styles.amount}>{formatCurrency(req.amount)}</Td>
                  <Td>{req.staffName ?? '-'}</Td>
                  <Td>
                    {req.staffNotes ? (
                      <span className={styles.staffNotes}>{req.staffNotes}</span>
                    ) : '-'}
                  </Td>
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
                    {req.reviewedByName && (
                      <span className={styles.reviewedBy}>by {req.reviewedByName}</span>
                    )}
                  </Td>
                  {isOwner && (
                    <Td>
                      {req.status === 'PENDING' && (
                        <div className={styles.requestActions}>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={actionLoading?.id === req.id && actionLoading?.action === 'APPROVE'}
                            disabled={actionLoading?.id === req.id}
                            onClick={() => handleRequest(req.id, 'APPROVE')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionLoading?.id === req.id && actionLoading?.action === 'REJECT'}
                            disabled={actionLoading?.id === req.id}
                            onClick={() => setRejectConfirm({ id: req.id, studentName: req.studentName ?? 'this request' })}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </Td>
                  )}
                </Tr>
                {req.status === 'REJECTED' && req.rejectionReason && (
                  <Tr>
                    <Td colSpan={isOwner ? 7 : 6}>
                      <div className={styles.rejectionRow}>
                        <span className={styles.rejectionLabel}>Rejection Reason:</span> {req.rejectionReason}
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

  /* -- Staff "My Requests" tab ------------------------------------------- */
  const myRequests = useMemo(() => {
    if (!user?.id) return [];
    return requests.filter((req) => req.staffUserId === user.id).filter((req) => matchesSearch(req.studentName));
  }, [requests, user?.id, matchesSearch]);

  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; studentName: string } | null>(null);

  const handleCancelRequest = useCallback(async () => {
    if (!cancelConfirm) return;
    setActionLoading({ id: cancelConfirm.id, action: 'CANCEL' });
    setActionError(null);
    const result = await handlePaymentRequest(cancelConfirm.id, 'CANCEL', undefined, accessToken);
    setActionLoading(null);
    if (!result.ok) {
      setActionError(result.error || 'Failed to cancel payment request');
    }
    setCancelConfirm(null);
    refetchRequests();
  }, [cancelConfirm, accessToken, refetchRequests]);

  const myRequestsTab = (
    <>
      <div className={styles.header} style={{ marginBottom: 'var(--space-4)' }}>
        <span />
        <Link href="/fees/new-request">
          <Button variant="primary" size="sm">New Request</Button>
        </Link>
      </div>
      {actionError && <Alert variant="error" message={actionError} />}
      {requestsLoading ? (
        <Spinner centered size="lg" />
      ) : myRequests.length === 0 ? (
        <EmptyState
          message="No payment requests yet"
          subtitle={searchQuery ? 'Try a different search' : 'Submit a payment request for a student using the button above.'}
        />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {myRequests.map((req) => (
              <Tr key={req.id}>
                <Td>{req.studentName ?? '-'}</Td>
                <Td>{getMonthLabel(req.monthKey)}</Td>
                <Td className={styles.amount}>{formatCurrency(req.amount)}</Td>
                <Td>{req.staffNotes || '-'}</Td>
                <Td>
                  <Badge
                    variant={
                      req.status === 'APPROVED' ? 'success' :
                      req.status === 'REJECTED' ? 'danger' :
                      req.status === 'CANCELLED' ? 'default' :
                      'warning'
                    }
                  >
                    {req.status}
                  </Badge>
                </Td>
                <Td>
                  {req.createdAt
                    ? new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Kolkata',
                      })
                    : '-'}
                </Td>
                <Td>
                  {req.status === 'PENDING' && (
                    <div className={styles.requestActions}>
                      <Link
                        href={`/fees/new-request?edit=true&requestId=${req.id}&studentId=${req.studentId}&monthKey=${req.monthKey}&amount=${req.amount}&notes=${encodeURIComponent(req.staffNotes || '')}`}
                      >
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={actionLoading?.id === req.id && actionLoading?.action === 'CANCEL'}
                        disabled={actionLoading?.id === req.id}
                        onClick={() => setCancelConfirm({ id: req.id, studentName: req.studentName ?? 'this request' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                      {req.rejectionReason}
                    </span>
                  )}
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

      {/* Search & Batch Filter */}
      <div className={styles.filters}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by student name..."
          className={styles.searchInput}
        />
        <Select
          options={batchOptions}
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          placeholder="All Batches"
          className={styles.batchFilter}
        />
        {selectedBatchId && (
          <Button variant="outline" size="sm" onClick={() => setSelectedBatchId('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          { key: 'unpaid', label: 'Unpaid Dues', content: unpaidTab },
          { key: 'paid', label: 'Paid', content: paidTab },
          ...(isStaff
            ? [{ key: 'my-requests', label: 'My Requests', content: myRequestsTab }]
            : [{ key: 'requests', label: 'Payment Requests', content: requestsTab }]
          ),
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Reject Confirmation */}
      <ConfirmDialog
        open={!!rejectConfirm}
        onClose={handleRejectClose}
        onConfirm={handleRejectConfirm}
        title="Reject Payment Request"
        message={`Are you sure you want to reject the payment request for ${rejectConfirm?.studentName ?? 'this student'}?`}
        confirmLabel="Reject"
        danger
        loading={actionLoading?.action === 'REJECT'}
      >
        <div className={styles.rejectReasonField}>
          <TextArea
            label="Rejection Reason"
            required
            placeholder="Enter the reason for rejection..."
            value={rejectionReason}
            onChange={(e) => { setRejectionReason(e.target.value); setRejectionReasonError(null); }}
            rows={3}
            maxLength={500}
            showCharCount
            error={rejectionReasonError ?? undefined}
          />
        </div>
      </ConfirmDialog>

      {/* Cancel Confirmation (staff) */}
      <ConfirmDialog
        open={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={handleCancelRequest}
        title="Cancel Payment Request"
        message={`Are you sure you want to cancel the payment request for ${cancelConfirm?.studentName ?? 'this student'}?`}
        confirmLabel="Cancel Request"
        danger
        loading={actionLoading?.action === 'CANCEL'}
      />
    </div>
  );
}
