'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

type Receipt = {
  feeDueId: string;
  studentName: string;
  monthKey: string;
  amount: number;
  paidAt: string;
  source: string;
  status: string;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function getMonthLabel(monthKey: string) {
  if (!monthKey) return '-';
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatSource(source: string) {
  if (!source) return '-';
  const map: Record<string, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    ONLINE: 'Online',
  };
  return map[source] ?? source;
}

type StatusVariant = 'success' | 'warning' | 'danger';

function getStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'warning';
  }
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const id = params.id as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    if (!id || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parent/receipts/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Failed to load receipt');
      }
      const data = await res.json();
      setReceipt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centered}>
          <Spinner centered size="lg" />
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className={styles.page}>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
            &larr; Back
          </Button>
        </div>
        <div className={styles.errorMessage}>
          <p>{error || 'Receipt not found'}</p>
          <Button variant="primary" size="sm" onClick={fetchReceipt} style={{ marginTop: 'var(--space-3)' }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const status = (receipt.status ?? '').toUpperCase();

  return (
    <div className={styles.page}>
      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
          &larr; Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.print()}
          iconLeft={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          }
        >
          Print
        </Button>
      </div>

      {/* Receipt Card */}
      <div className={styles.receipt}>
        {/* Header */}
        <div className={styles.receiptHeader}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </div>
            <span className={styles.brandName}>Academyflo</span>
          </div>
          <span className={styles.receiptLabel}>Payment Receipt</span>
        </div>

        {/* Body */}
        <div className={styles.receiptBody}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Receipt No.</span>
            <span className={styles.rowValue}>{receipt.feeDueId || id}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Date of Payment</span>
            <span className={styles.rowValue}>
              {receipt.paidAt ? formatDate(receipt.paidAt) : '-'}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Student Name</span>
            <span className={styles.rowValue}>{receipt.studentName || '-'}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Month / Period</span>
            <span className={styles.rowValue}>{getMonthLabel(receipt.monthKey ?? '')}</span>
          </div>

          <div className={`${styles.row} ${styles.amountRow}`}>
            <span className={styles.rowLabel}>Amount Paid</span>
            <span className={`${styles.rowValue} ${styles.amountValue}`}>
              {formatCurrency(Number(receipt.amount) || 0)}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Payment Source</span>
            <span className={styles.rowValue}>{formatSource(receipt.source ?? '')}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Status</span>
            <span className={styles.rowValue}>
              <Badge variant={getStatusVariant(status)}>{status || '-'}</Badge>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.receiptFooter}>
          This is a computer-generated receipt and does not require a signature.
        </div>
      </div>
    </div>
  );
}
