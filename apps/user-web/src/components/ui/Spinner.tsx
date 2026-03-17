'use client';

import React from 'react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  centered?: boolean;
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', centered = false, className, label = 'Loading' }: SpinnerProps) {
  const spinner = (
    <span
      className={`${styles.spinner} ${styles[size]} ${className ?? ''}`}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );

  if (centered) {
    return <div className={styles.centered}>{spinner}</div>;
  }

  return spinner;
}
