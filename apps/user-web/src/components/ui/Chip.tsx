'use client';

import React from 'react';
import styles from './Chip.module.css';

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  disabled = false,
  onSelect,
  onRemove,
  className,
}: ChipProps) {
  const classNames = [
    styles.chip,
    selected && styles.selected,
    disabled && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classNames}
      role="button"
      aria-selected={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect?.()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          aria-label={`Remove ${label}`}
          tabIndex={0}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
}
