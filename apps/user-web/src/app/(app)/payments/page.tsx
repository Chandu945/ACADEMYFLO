'use client';

import React from 'react';
import Link from 'next/link';
import { usePaymentHistory } from '@/application/parent/use-parent';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

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

export default function PaymentsPage() {
  const { data, loading, refetch } = usePaymentHistory();

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Payment History</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
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
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          }
        >
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner centered size="lg" />
      ) : data.length === 0 ? (
        <div className={styles.empty}>
          <svg
            className={styles.emptyIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span>No payments yet</span>
        </div>
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Student</Th>
              <Th>Month</Th>
              <Th>Amount (&#8377;)</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((item) => {
              const id = (item._id ?? item.feeDueId ?? '') as string;
              const feeDueId = (item.feeDueId ?? item._id ?? '') as string;
              const status = ((item.status as string) ?? '').toUpperCase();

              return (
                <Tr key={id || Math.random().toString()}>
                  <Td>
                    {item.paidAt
                      ? formatDate(item.paidAt as string)
                      : '-'}
                  </Td>
                  <Td>{(item.studentName as string) ?? '-'}</Td>
                  <Td>{getMonthLabel((item.monthKey as string) ?? '')}</Td>
                  <Td className={styles.amount}>
                    {formatCurrency(Number(item.amount) || 0)}
                  </Td>
                  <Td>{formatSource((item.source as string) ?? '')}</Td>
                  <Td>
                    <Badge variant={getStatusVariant(status)}>
                      {status || '-'}
                    </Badge>
                  </Td>
                  <Td>
                    {(status === 'COMPLETED' || status === 'PAID') && feeDueId ? (
                      <Link href={`/payments/${feeDueId}/receipt`}>
                        <Button variant="outline" size="sm">
                          View Receipt
                        </Button>
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        &mdash;
                      </span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
