'use client';

import { Menu } from 'lucide-react';

import { useAdminAuth } from '@/application/auth/use-admin-auth';
import { useSidebar } from './AdminShell';
import styles from './TopHeader.module.css';

export function TopHeader() {
  const { user } = useAdminAuth();
  const { collapsed, toggle } = useSidebar();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {collapsed && (
          <button
            type="button"
            className={styles.menuButton}
            onClick={toggle}
            aria-label="Expand sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <span className={styles.title}>PlayConnect Admin</span>
      </div>
      {user && <span className={styles.userEmail}>{user.email}</span>}
    </header>
  );
}
