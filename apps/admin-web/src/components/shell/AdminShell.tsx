'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SidebarContext } from './SidebarContext';
import styles from './AdminShell.module.css';

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
        <Sidebar />
        <div className={styles.main}>
          <TopHeader />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
