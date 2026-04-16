'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { useAdminAuth } from '@/application/auth/use-admin-auth';
import { useSidebar } from './SidebarContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/academies', label: 'Academies', icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <Image
          src="/logo.png"
          alt="Academyflo"
          width={collapsed ? 28 : 32}
          height={collapsed ? 28 : 32}
          priority
        />
        {!collapsed && <span className={styles.brandName}>Academyflo</span>}
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
