'use client';

import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const defaultIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export function EmptyState({ icon, message, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.iconCircle} aria-hidden="true">
        {icon ?? defaultIcon}
      </div>
      <p className={styles.message}>{message}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
