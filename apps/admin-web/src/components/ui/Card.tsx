'use client';

import type { ReactNode } from 'react';

import styles from './Card.module.css';

type CardProps = {
  children: ReactNode;
  title?: string;
  hoverable?: boolean;
  noPadding?: boolean;
  className?: string;
};

export function Card({ children, title, hoverable, noPadding, className }: CardProps) {
  const cls = [
    styles.card,
    hoverable ? styles.hoverable : '',
    noPadding ? '' : styles.padded,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </div>
  );
}
