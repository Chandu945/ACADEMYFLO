'use client';

import Link from 'next/link';

import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AdminUserItem } from '@/application/admin-users/admin-users.schemas';

import styles from './AdminUsersTable.module.css';

type Props = {
  items: AdminUserItem[];
  loading: boolean;
};

const COLUMNS = ['Name', 'Email', 'Phone', 'Role', 'Academy', 'Status', 'Joined'] as const;
const SKELETON_ROWS = 8;

const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

function roleVariant(role: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (role === 'SUPER_ADMIN') return 'danger';
  if (role === 'OWNER') return 'info';
  if (role === 'STAFF') return 'success';
  return 'default';
}

export function AdminUsersTable({ items, loading }: Props) {
  if (loading) {
    return (
      <Table aria-label="Search results">
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
        <p className={styles.emptyTitle}>No users match this search.</p>
        <p className={styles.emptyHint}>
          Try a partial name, the start of an email, or the last digits of a phone number.
        </p>
      </div>
    );
  }

  return (
    <Table aria-label="Search results">
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
        {items.map((user) => (
          <tr key={user.id}>
            <td className={styles.nameCell}>{user.fullName}</td>
            <td className={styles.email}>{user.emailNormalized}</td>
            <td className={styles.phone}>{user.phoneE164}</td>
            <td>
              <Badge label={user.role} variant={roleVariant(user.role)} />
            </td>
            <td>
              {user.academyId ? (
                <Link href={`/academies/${user.academyId}`} className={styles.academyLink}>
                  {user.academyName ?? <span className={styles.muted}>(unnamed)</span>}
                </Link>
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </td>
            <td>
              <Badge label={user.status} variant={user.status === 'ACTIVE' ? 'success' : 'default'} />
            </td>
            <td className={styles.joined}>{dateFormatter.format(new Date(user.createdAt))}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
