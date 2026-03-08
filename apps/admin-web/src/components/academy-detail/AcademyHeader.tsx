'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';

import styles from './AcademyHeader.module.css';

type AcademyHeaderProps = {
  name: string;
  status: string;
  loginDisabled: boolean;
};

function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'ACTIVE_PAID':
      return 'success';
    case 'TRIAL':
      return 'info';
    case 'EXPIRED_GRACE':
      return 'warning';
    case 'BLOCKED':
    case 'DISABLED':
      return 'danger';
    default:
      return 'default';
  }
}

export function AcademyHeader({ name, status, loginDisabled }: AcademyHeaderProps) {
  return (
    <div className={styles.header}>
      <Link href="/academies" className={styles.backLink}>
        &larr; Back to Academies
      </Link>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{name}</h1>
        <Badge label={status.replace(/_/g, ' ')} variant={statusBadgeVariant(status)} />
        {loginDisabled && <Badge label="Login Disabled" variant="danger" />}
      </div>
    </div>
  );
}
