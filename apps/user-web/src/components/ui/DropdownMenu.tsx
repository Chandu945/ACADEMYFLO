'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './DropdownMenu.module.css';

/* ── Types ── */
export type DropdownMenuItem =
  | {
      type?: 'item';
      key: string;
      label: string;
      icon?: React.ReactNode;
      danger?: boolean;
      disabled?: boolean;
      onClick: () => void;
    }
  | { type: 'divider' }
  | { type: 'label'; label: string };

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleItemClick = useCallback(
    (item: DropdownMenuItem) => {
      if (item.type === 'divider' || item.type === 'label') return;
      if (item.disabled) return;
      item.onClick();
      setOpen(false);
    },
    [],
  );

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ''}`}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`${styles.panel} ${align === 'left' ? styles.panelLeft : ''}`}
          role="menu"
        >
          {items.map((item, idx) => {
            if (item.type === 'divider') {
              return <div key={`divider-${idx}`} className={styles.divider} role="separator" />;
            }

            if (item.type === 'label') {
              return (
                <div key={`label-${idx}`} className={styles.label} role="presentation">
                  {item.label}
                </div>
              );
            }

            const itemClasses = [
              styles.item,
              item.danger && styles.itemDanger,
              item.disabled && styles.itemDisabled,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={item.key}
                type="button"
                className={itemClasses}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
              >
                {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
