'use client';

import Link from 'next/link';

import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AdminPaymentItem } from '@/application/admin-payments/admin-payments.schemas';

import styles from './AdminPaymentsTable.module.css';

type Props = {
  items: AdminPaymentItem[];
  loading: boolean;
};

const COLUMNS = [
  'Created',
  'Academy',
  'Owner',
  'Tier',
  'Amount',
  'Status',
  'Order ID',
  'Notes',
] as const;
const SKELETON_ROWS = 8;

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatTier(tier: string): string {
  switch (tier) {
    case 'TIER_0_50':
      return '0–50';
    case 'TIER_51_100':
      return '51–100';
    case 'TIER_101_PLUS':
      return '101+';
    default:
      return tier;
  }
}

function statusVariant(s: AdminPaymentItem['status']): 'success' | 'warning' | 'danger' {
  if (s === 'SUCCESS') return 'success';
  if (s === 'FAILED') return 'danger';
  return 'warning';
}

function pendingMinutes(createdAtIso: string): number {
  return Math.floor((Date.now() - new Date(createdAtIso).getTime()) / 60_000);
}

function formatPendingAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (60 * 24))}d`;
}

export function AdminPaymentsTable({ items, loading }: Props) {
  if (loading) {
    return (
      <Table aria-label="Subscription payments">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={`skel-${i}`}>
              {COLUMNS.map((c) => (
                <td key={c}>
                  <Skeleton height="14px" width="70%" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No subscription payments match these filters.</p>
        <p className={styles.emptyHint}>
          Try clearing the status filter or widening the date range.
        </p>
      </div>
    );
  }

  return (
    <Table aria-label="Subscription payments">
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isStuck = item.status === 'PENDING' && pendingMinutes(item.createdAt) >= 15;
          const note =
            item.status === 'PENDING'
              ? `Waiting ${formatPendingAge(pendingMinutes(item.createdAt))}`
              : item.status === 'FAILED'
                ? item.failureReason ?? 'Failed'
                : item.providerPaymentId
                  ? `cf_id ${item.providerPaymentId}`
                  : '';
          return (
            <tr key={item.id} className={isStuck ? styles.rowStuck : undefined}>
              <td className={styles.dateCell}>{dateFormatter.format(new Date(item.createdAt))}</td>
              <td>
                <Link href={`/academies/${item.academyId}`} className={styles.academyLink}>
                  {item.academyName ?? <span className={styles.muted}>(unnamed)</span>}
                </Link>
              </td>
              <td className={styles.ownerCell}>
                <span>{item.ownerName ?? <span className={styles.muted}>—</span>}</span>
                {item.ownerEmail && <span className={styles.ownerEmail}>{item.ownerEmail}</span>}
              </td>
              <td>{formatTier(item.tierKey)}</td>
              <td className={styles.amountCell}>{inrFormatter.format(item.amountInr)}</td>
              <td>
                <Badge label={item.status} variant={statusVariant(item.status)} />
              </td>
              <td className={styles.orderCell}>
                <span className={styles.orderId}>{item.orderId}</span>
                {item.cfOrderId && <span className={styles.cfOrderId}>cf {item.cfOrderId}</span>}
              </td>
              <td className={styles.noteCell}>{note}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
