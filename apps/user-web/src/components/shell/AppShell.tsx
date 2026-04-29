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
    // suppressHydrationWarning: the SSR output renders this loading state with
    // isLoading=true, but Next 15 + React 19 sometimes interleave HMR / webpack
    // chunk scripts in the same position during dev SSR. Functionally harmless;
    // the warning is just noise that scares devs.
    return (
      <div className={styles.loadingContainer} suppressHydrationWarning>
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
