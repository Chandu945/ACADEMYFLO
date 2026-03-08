'use client';

import type { ReactNode } from 'react';

import styles from './Alert.module.css';

type AlertProps = {
  variant?: 'error' | 'info' | 'success' | 'warning';
  children: ReactNode;
  action?: ReactNode;
};

export function Alert({ variant = 'error', children, action }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[variant]}`} role="alert">
      <span className={styles.message}>{children}</span>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
