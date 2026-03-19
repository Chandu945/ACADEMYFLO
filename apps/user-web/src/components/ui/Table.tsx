'use client';

import React from 'react';
import styles from './Table.module.css';

/* ── Table ── */
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  compact?: boolean;
}

export function Table({ striped, compact, className, children, ...props }: TableProps) {
  const wrapperClasses = [
    styles.wrapper,
    striped && styles.striped,
    compact && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      <table className={styles.table} {...props}>
        {children}
      </table>
    </div>
  );
}

/* ── Thead ── */
export interface TheadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function Thead({ className, children, ...props }: TheadProps) {
  return (
    <thead className={`${styles.thead} ${className ?? ''}`} {...props}>
      {children}
    </thead>
  );
}

/* ── Tbody ── */
export interface TbodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function Tbody({ className, children, ...props }: TbodyProps) {
  return (
    <tbody className={`${styles.tbody} ${className ?? ''}`} {...props}>
      {children}
    </tbody>
  );
}

/* ── Tr ── */
export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
}

export function Tr({ clickable, className, children, ...props }: TrProps) {
  const classNames = [styles.tr, clickable && styles.clickableRow, className]
    .filter(Boolean)
    .join(' ');

  return (
    <tr
      className={classNames}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'link' : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                props.onClick?.(e as unknown as React.MouseEvent<HTMLTableRowElement>);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </tr>
  );
}

/* ── Th ── */
export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export function Th({ className, children, ...props }: ThProps) {
  return (
    <th scope={props.scope ?? 'col'} className={`${styles.th} ${className ?? ''}`} {...props}>
      {children}
    </th>
  );
}

/* ── Td ── */
export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function Td({ className, children, ...props }: TdProps) {
  return (
    <td className={`${styles.td} ${className ?? ''}`} {...props}>
      {children}
    </td>
  );
}
