'use client';

import type { AuditLogItem } from '@/domain/admin/audit-logs';
import { Table } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';

import styles from './AuditLogsTable.module.css';

type AuditLogsTableProps = {
  items: AuditLogItem[];
  loading: boolean;
};

const SKELETON_ROWS = 5;
const COLUMNS = ['Time', 'Action', 'Actor', 'Entity', 'Context'];
const MAX_CONTEXT_KEYS = 6;
const MAX_VALUE_LENGTH = 40;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ');
}

function formatActor(actor: AuditLogItem['actor']): string {
  const label = actor.name ?? actor.userId;
  return actor.role ? `${actor.role}: ${label}` : label;
}

function formatEntity(entity: AuditLogItem['entity']): string {
  if (entity.id) return `${entity.type} ${entity.id}`;
  return entity.type;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + '\u2026' : value;
}

function renderContext(context: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(context).slice(0, MAX_CONTEXT_KEYS);
  if (entries.length === 0) return '\u2014';
  return (
    <span className={styles.contextChips}>
      {entries.map(([key, val]) => (
        <span key={key} className={styles.chip}>
          {key}: {truncate(String(val ?? ''), MAX_VALUE_LENGTH)}
        </span>
      ))}
    </span>
  );
}

export function AuditLogsTable({ items, loading }: AuditLogsTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th key={col} scope="col">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={`skel-${i}`}>
              {COLUMNS.map((col) => (
                <td key={col}>
                  <Skeleton height="16px" width="80%" />
                </td>
              ))}
            </tr>
          ))}
        {!loading && items.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className={styles.emptyCell}>
              No audit logs found for the selected filters.
            </td>
          </tr>
        )}
        {!loading &&
          items.map((item) => (
            <tr key={item.id}>
              <td className={styles.nowrap}>{formatTime(item.occurredAt)}</td>
              <td>{formatAction(item.actionType)}</td>
              <td>{formatActor(item.actor)}</td>
              <td>{formatEntity(item.entity)}</td>
              <td>{renderContext(item.context)}</td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
}
