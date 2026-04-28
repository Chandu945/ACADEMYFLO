'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, Users, ScrollText, CreditCard, TrendingUp, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { useAdminAuth } from '@/application/auth/use-admin-auth';
import { useSidebar } from './SidebarContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/academies', label: 'Academies', icon: GraduationCap },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/audit-logs', label: 'Audit log', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const { collapsed, toggle } = useSidebar();

  // Mount-flag avoids a hydration mismatch on the active nav item: the
  // server can't always be sure which nav item to highlight (App Router
  // dynamic routing makes pathname value differ between SSR and CSR in
  // some edge cases). We render the unhighlighted state on the first
  // paint, then upgrade to the active highlight after mount. The visual
  // delay is one frame — imperceptible.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
          const isActive =
            mounted && (pathname === item.href || pathname.startsWith(`${item.href}/`));
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
