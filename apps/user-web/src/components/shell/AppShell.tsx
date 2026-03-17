'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/application/auth/use-auth';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { Spinner } from '@/components/ui/Spinner';
import styles from './AppShell.module.css';

export function AppShell({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
      />
      <div className={styles.main}>
        <TopHeader onMenuToggle={() => setSidebarCollapsed((p) => !p)} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
