'use client';

import styles from './Badge.module.css';

type BadgeProps = {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{label}</span>;
}
