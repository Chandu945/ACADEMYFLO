'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  IndianRupee,
  Layers,
  UserPlus,
  ClipboardList,
  Wallet,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  Settings,
  CreditCard,
  Baby,
  Receipt,
  Building2,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/application/auth/use-auth';
import styles from './Sidebar.module.css';

/* ── Navigation definitions per role ─────────────────────────────────── */

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const OWNER_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Students', href: '/students', icon: Users },
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { label: 'Fees', href: '/fees', icon: IndianRupee },
      { label: 'Batches', href: '/batches', icon: Layers },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Staff', href: '/staff', icon: UserPlus },
      { label: 'Staff Attendance', href: '/staff-attendance', icon: ClipboardList },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Expenses', href: '/expenses', icon: Wallet },
    ],
  },
  {
    title: 'Engage',
    items: [
      { label: 'Events', href: '/events', icon: Calendar },
      { label: 'Enquiries', href: '/enquiries', icon: MessageSquare },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Audit Logs', href: '/audit-logs', icon: Shield },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Subscription', href: '/subscription', icon: CreditCard },
    ],
  },
];

const STAFF_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Students', href: '/students', icon: Users },
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { label: 'Fees', href: '/fees', icon: IndianRupee },
      { label: 'Batches', href: '/batches', icon: Layers },
    ],
  },
  {
    title: 'Engage',
    items: [
      { label: 'Enquiries', href: '/enquiries', icon: MessageSquare },
      { label: 'Events', href: '/events', icon: Calendar },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const PARENT_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Children', href: '/my-children', icon: Baby },
      { label: 'Payments', href: '/payments', icon: Receipt },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Academy Info', href: '/academy-info', icon: Building2 },
    ],
  },
];

const NAV_MAP: Record<string, NavSection[]> = {
  OWNER: OWNER_NAV,
  STAFF: STAFF_NAV,
  PARENT: PARENT_NAV,
};

/* ── Component ───────────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.role;
  if (!role) return null;
  const sections = NAV_MAP[role] ?? OWNER_NAV;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${!collapsed ? styles.overlayVisible : ''}`}
        onClick={onToggle}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
        aria-label="Main navigation"
      >
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="#0891b2" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="#fff"
                fontSize="18"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
              >
                P
              </text>
            </svg>
          </div>
          {!collapsed && <span className={styles.brandName}>PlayConnect</span>}
        </div>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <nav className={styles.nav}>
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={styles.section}>
              {section.title && !collapsed && (
                <span className={styles.sectionTitle}>{section.title}</span>
              )}
              {section.title && collapsed && <div className={styles.sectionDivider} />}
              <ul className={styles.navList} role="list">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={20} className={styles.navIcon} />
                        {!collapsed && (
                          <span className={styles.navLabel}>{item.label}</span>
                        )}
                        {active && <span className={styles.activeIndicator} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer: User + Collapse toggle ────────────────────────── */}
        <div className={styles.footer}>
          {user && (
            <div className={styles.userSection}>
              <div className={styles.avatar}>
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.fullName}
                    className={styles.avatarImg}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.fullName}</span>
                  <span className={styles.userRole}>
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </span>
                </div>
              )}
              <button
                className={styles.logoutBtn}
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}

          <button
            className={styles.collapseBtn}
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
