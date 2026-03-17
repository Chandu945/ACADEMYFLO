'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Bell, Search } from 'lucide-react';

import { useAuth } from '@/application/auth/use-auth';
import styles from './TopHeader.module.css';

/* ── Breadcrumb helper ───────────────────────────────────────────────── */

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = '';
  for (const segment of segments) {
    path += `/${segment}`;
    // Skip dynamic segments like [id]
    if (segment.startsWith('[')) continue;
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface TopHeaderProps {
  onMenuToggle: () => void;
}

export function TopHeader({ onMenuToggle }: TopHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const crumbs = buildBreadcrumbs(pathname);
  const pageTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1].label : 'Dashboard';

  return (
    <header className={styles.header}>
      {/* ── Left: Mobile menu + Breadcrumbs ────────────────────────── */}
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        <div className={styles.breadcrumbs}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          {crumbs.length > 1 && (
            <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
              <ol className={styles.breadcrumbList}>
                {crumbs.map((crumb, idx) => {
                  const isLast = idx === crumbs.length - 1;
                  return (
                    <li key={crumb.href} className={styles.breadcrumbItem}>
                      {idx > 0 && (
                        <span className={styles.breadcrumbSep} aria-hidden="true">
                          /
                        </span>
                      )}
                      {isLast ? (
                        <span className={styles.breadcrumbCurrent} aria-current="page">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link href={crumb.href} className={styles.breadcrumbLink}>
                          {crumb.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>
      </div>

      {/* ── Right: Search, Notifications, User ─────────────────────── */}
      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Search" title="Search">
          <Search size={20} />
        </button>

        <button
          className={styles.iconBtn}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className={styles.notifDot} />
        </button>

        <div className={styles.userPill}>
          <div className={styles.userAvatar}>
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.fullName}
                className={styles.avatarImg}
              />
            ) : (
              <span className={styles.avatarFallback}>
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <span className={styles.userNameText}>{user?.fullName ?? 'User'}</span>
        </div>
      </div>
    </header>
  );
}
