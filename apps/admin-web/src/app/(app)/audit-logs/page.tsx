'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAdminAudit } from '@/application/admin-audit/use-admin-audit';
import type { AdminAuditQuery } from '@/application/admin-audit/admin-audit.service';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AdminAuditFilters } from '@/components/admin-audit/AdminAuditFilters';
import { AdminAuditTable } from '@/components/admin-audit/AdminAuditTable';
import { Pagination } from '@/components/academies/Pagination';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';

import styles from './page.module.css';

const DEFAULT_PAGE_SIZE = 50;

function parseQuery(sp: URLSearchParams): AdminAuditQuery {
  return {
    page: clampInt(sp.get('page'), 1, 1),
    pageSize: clampInt(sp.get('pageSize'), DEFAULT_PAGE_SIZE, 1),
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    action: sp.get('action') || undefined,
    entityType: sp.get('entityType') || undefined,
    academyId: sp.get('academyId') || undefined,
    actorUserId: sp.get('actorUserId') || undefined,
  };
}

function clampInt(raw: string | null, fallback: number, min: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, loading, error, refetch } = useAdminAudit(query);

  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.push(`/audit-logs?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleFiltersChange = useCallback(
    (filters: Partial<AdminAuditQuery>) => {
      updateUrl({
        from: filters.from,
        to: filters.to,
        action: filters.action,
        entityType: filters.entityType,
        academyId: filters.academyId,
        actorUserId: filters.actorUserId,
        page: '1',
      });
    },
    [updateUrl],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => updateUrl({ page: String(nextPage) }),
    [updateUrl],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit log</h1>
          <p className={styles.subtitle}>
            Every action recorded across all academies. Newest first.
          </p>
        </div>
        <div className={styles.headerActions}>
          {data && (
            <span className={styles.totalPill}>
              {data.meta.totalItems.toLocaleString('en-IN')}{' '}
              {data.meta.totalItems === 1 ? 'event' : 'events'}
            </span>
          )}
          <ExportCsvButton
            href="/api/admin/audit-logs/export"
            params={{
              from: query.from,
              to: query.to,
              action: query.action,
              entityType: query.entityType,
              academyId: query.academyId,
              actorUserId: query.actorUserId,
            }}
            disabled={loading || !data || data.meta.totalItems === 0}
          />
        </div>
      </header>

      <AdminAuditFilters initial={query} onChange={handleFiltersChange} />

      {error && (
        <Alert variant="error" action={<Button size="sm" onClick={refetch}>Retry</Button>}>
          {error.message}
        </Alert>
      )}

      <AdminAuditTable items={data?.items ?? []} loading={loading} />

      {data && data.meta.totalItems > 0 && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          totalItems={data.meta.totalItems}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => updateUrl({ pageSize: String(size), page: '1' })}
          itemSingular="event"
          itemPlural="events"
        />
      )}
    </div>
  );
}
