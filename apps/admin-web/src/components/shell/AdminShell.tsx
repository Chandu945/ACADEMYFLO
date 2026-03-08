'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import styles from './AdminShell.module.css';

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

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
