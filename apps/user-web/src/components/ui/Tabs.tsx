'use client';

import React, { useState, useId } from 'react';
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

  const handleSelect = (key: string) => {
    if (activeKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  const activeItem = items.find((item) => item.key === currentKey);

  return (
    <div className={`${styles.tabs} ${className ?? ''}`}>
      <div className={styles.tabList} role="tablist" aria-orientation="horizontal">
        {items.map((item) => {
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
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.key}`}
              aria-disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              className={tabClasses}
              onClick={() => !item.disabled && handleSelect(item.key)}
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
