'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { USER_ROLES } from '@academyflo/contracts';
import { useAdminUsers } from '@/application/admin-users/use-admin-users';
import type { AdminUsersQuery } from '@/application/admin-users/admin-users.service';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AdminUsersTable } from '@/components/admin-users/AdminUsersTable';
import { Pagination } from '@/components/academies/Pagination';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';

import styles from './page.module.css';

const DEFAULT_PAGE_SIZE = 25;
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  ...USER_ROLES.map((r) => ({ value: r, label: r })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...STATUSES.map((s) => ({ value: s, label: s })),
];

function clampInt(raw: string | null, fallback: number, min: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

function parseQuery(sp: URLSearchParams): AdminUsersQuery {
  const status = sp.get('status');
  return {
    page: clampInt(sp.get('page'), 1, 1),
    pageSize: clampInt(sp.get('pageSize'), DEFAULT_PAGE_SIZE, 1),
    q: sp.get('q') || undefined,
    role: sp.get('role') || undefined,
    academyId: sp.get('academyId') || undefined,
    status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, loading, error, refetch } = useAdminUsers(query);

  // Local search input — debounced before pushing to URL so we don't fire
  // a query on every keystroke. 300ms feels responsive without thrash.
  const [qDraft, setQDraft] = useState(query.q ?? '');
  useEffect(() => setQDraft(query.q ?? ''), [query.q]);

  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.push(`/users?${next.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (qDraft === (query.q ?? '')) return;
    const timer = setTimeout(() => {
      updateUrl({ q: qDraft.trim() || undefined, page: '1' });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>
            Find any owner, staff member, or parent across all academies.
          </p>
        </div>
        <div className={styles.headerActions}>
          {data && (
            <span className={styles.totalPill}>
              {data.meta.totalItems.toLocaleString('en-IN')}{' '}
              {data.meta.totalItems === 1 ? 'match' : 'matches'}
            </span>
          )}
          <ExportCsvButton
            href="/api/admin/users/export"
            params={{
              q: query.q,
              role: query.role,
              academyId: query.academyId,
              status: query.status,
            }}
            disabled={loading || !data || data.meta.totalItems === 0}
          />
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <Input
            label="Search"
            name="q"
            placeholder="Name, email, or phone"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>
        <Select
          label="Role"
          name="role"
          options={ROLE_OPTIONS}
          value={query.role ?? ''}
          onChange={(e) => updateUrl({ role: e.target.value || undefined, page: '1' })}
        />
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          value={query.status ?? ''}
          onChange={(e) => updateUrl({ status: e.target.value || undefined, page: '1' })}
        />
      </div>

      {error && (
        <Alert variant="error" action={<Button size="sm" onClick={refetch}>Retry</Button>}>
          {error.message}
        </Alert>
      )}

      <AdminUsersTable items={data?.items ?? []} loading={loading} />

      {data && data.meta.totalItems > 0 && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          totalItems={data.meta.totalItems}
          totalPages={data.meta.totalPages}
          onPageChange={(p) => updateUrl({ page: String(p) })}
          onPageSizeChange={(s) => updateUrl({ pageSize: String(s), page: '1' })}
          itemSingular="user"
          itemPlural="users"
        />
      )}
    </div>
  );
}
