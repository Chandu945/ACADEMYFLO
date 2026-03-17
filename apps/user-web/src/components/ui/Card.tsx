'use client';

import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
  clickable?: boolean;
  noPadding?: boolean;
  footer?: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  hoverable = false,
  clickable = false,
  noPadding = false,
  footer,
  children,
  className,
  ...props
}: CardProps) {
  const classNames = [
    styles.card,
    hoverable && styles.hoverable,
    clickable && styles.clickable,
    noPadding && styles.noPadding,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
