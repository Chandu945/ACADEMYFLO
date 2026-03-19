'use client';

import React, { useState, useId, useRef, useCallback } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  key: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function Tabs({ items, defaultActiveKey, activeKey, onChange, className }: TabsProps) {
  const baseId = useId();
  const [internalKey, setInternalKey] = useState(defaultActiveKey ?? items[0]?.key ?? '');
  const currentKey = activeKey ?? internalKey;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelect = (key: string) => {
    if (activeKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabledIndices = items
        .map((item, i) => (!item.disabled ? i : -1))
        .filter((i) => i !== -1);
      const posInEnabled = enabledIndices.indexOf(index);
      let nextIndex: number | undefined;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = posInEnabled + 1 >= enabledIndices.length ? 0 : posInEnabled + 1;
        nextIndex = enabledIndices[next];
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = posInEnabled - 1 < 0 ? enabledIndices.length - 1 : posInEnabled - 1;
        nextIndex = enabledIndices[prev];
      }

      if (nextIndex !== undefined) {
        tabRefs.current[nextIndex]?.focus();
        handleSelect(items[nextIndex].key);
      }
    },
    [items, handleSelect],
  );

  const activeItem = items.find((item) => item.key === currentKey);

  return (
    <div className={`${styles.tabs} ${className ?? ''}`}>
      <div className={styles.tabList} role="tablist" aria-orientation="horizontal">
        {items.map((item, idx) => {
          const isActive = item.key === currentKey;
          const tabClasses = [
            styles.tab,
            isActive && styles.tabActive,
            item.disabled && styles.tabDisabled,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={item.key}
              ref={(el) => { tabRefs.current[idx] = el; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.key}`}
              aria-disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              className={tabClasses}
              onClick={() => !item.disabled && handleSelect(item.key)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
            >
              {item.label}
              {item.badge !== undefined && (
                <span className={styles.tabBadge}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {activeItem && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.key}`}
          aria-labelledby={`${baseId}-tab-${activeItem.key}`}
          className={styles.tabPanel}
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
