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

  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and return focus to trigger
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Focus first menuitem when menu opens
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const firstItem = panelRef.current.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    firstItem?.focus();
  }, [open]);

  const handleItemClick = useCallback(
    (item: DropdownMenuItem) => {
      if (item.type === 'divider' || item.type === 'label') return;
      if (item.disabled) return;
      item.onClick();
      setOpen(false);
    },
    [items],
  );

  const handlePanelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const panel = panelRef.current;
      if (!panel) return;
      const menuItems = Array.from(
        panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
      );
      if (menuItems.length === 0) return;
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentIndex + 1 >= menuItems.length ? 0 : currentIndex + 1;
          menuItems[next].focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentIndex - 1 < 0 ? menuItems.length - 1 : currentIndex - 1;
          menuItems[prev].focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          menuItems[0].focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          menuItems[menuItems.length - 1].focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        }
      }
    },
    [],
  );

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ''}`}>
      <button
        ref={triggerRef}
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
          onKeyDown={handlePanelKeyDown}
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
