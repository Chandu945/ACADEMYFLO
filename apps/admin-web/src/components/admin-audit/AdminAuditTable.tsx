'use client';

import Link from 'next/link';

import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AdminAuditLogItem } from '@/application/admin-audit/admin-audit.schemas';

import styles from './AdminAuditTable.module.css';

type Props = {
  items: AdminAuditLogItem[];
  loading: boolean;
};

const COLUMNS = ['When', 'Academy', 'Actor', 'Action', 'Entity', 'Context'] as const;
const SKELETON_ROWS = 8;

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function actionVariant(action: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (/(_FAILED|_DELETED|FORCE_LOGOUT|RESET|DEACTIV|REVOK|BLOCK)/i.test(action)) return 'danger';
  if (/(CREATED|COMPLETED|SUCCESS|ACTIVATED|GRANTED)/i.test(action)) return 'success';
  if (/(WARN|EXPIR|GRACE)/i.test(action)) return 'warning';
  if (/(LOGIN|VIEW|VERIFIED)/i.test(action)) return 'info';
  return 'default';
}

function contextSummary(context: Record<string, unknown>): string {
  const entries = Object.entries(context).slice(0, 3);
  if (entries.length === 0) return '—';
  return entries
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export function AdminAuditTable({ items, loading }: Props) {
  if (loading) {
    return (
      <Table aria-label="Audit log entries">
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
        <p className={styles.emptyTitle}>No audit events match these filters.</p>
        <p className={styles.emptyHint}>
          Try widening the date range or clearing the action / entity filter.
        </p>
      </div>
    );
  }

  return (
    <Table aria-label="Audit log entries">
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
        {items.map((item) => (
          <tr key={item.id}>
            <td className={styles.whenCell}>{formatDate(item.occurredAt)}</td>
            <td>
              <Link href={`/academies/${item.academy.id}`} className={styles.academyLink}>
                {item.academy.name ?? <span className={styles.muted}>(unnamed)</span>}
              </Link>
            </td>
            <td>{item.actor.name ?? <span className={styles.muted}>—</span>}</td>
            <td>
              <Badge label={item.actionType.replace(/_/g, ' ')} variant={actionVariant(item.actionType)} />
            </td>
            <td className={styles.entityCell}>
              <span className={styles.entityType}>{item.entity.type.replace(/_/g, ' ')}</span>
              {item.entity.id && <span className={styles.entityId}>{item.entity.id}</span>}
            </td>
            <td className={styles.contextCell}>{contextSummary(item.context)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
