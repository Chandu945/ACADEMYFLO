'use client';

import type { ReactNode } from 'react';

import styles from './Table.module.css';

type TableProps = {
  children: ReactNode;
};

export function Table({ children }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
