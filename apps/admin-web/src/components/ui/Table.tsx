'use client';

import type { ReactNode } from 'react';

import styles from './Table.module.css';

type TableProps = {
  children: ReactNode;
  'aria-label'?: string;
};

export function Table({ children, 'aria-label': ariaLabel }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-label={ariaLabel}>{children}</table>
    </div>
  );
}
