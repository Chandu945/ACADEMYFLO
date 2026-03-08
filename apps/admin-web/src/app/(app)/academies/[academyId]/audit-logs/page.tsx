'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { useAuditLogs } from '@/application/audit-logs/use-audit-logs';
import { parseQuery } from '@/application/audit-logs/query';
import type { AuditActionType } from '@/domain/admin/audit-logs';
import { AuditLogsFilters } from '@/components/audit-logs/AuditLogsFilters';
import { AuditLogsTable } from '@/components/audit-logs/AuditLogsTable';
import { Pagination } from '@/components/academies/Pagination';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

import styles from './page.module.css';

const AUDIT_PAGE_SIZE_OPTIONS = [
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
];

export default function AuditLogsPage() {
  const { academyId } = useParams<{ academyId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, loading, error, refetch } = useAuditLogs(academyId, query);

  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      router.push(`/academies/${academyId}/audit-logs?${next.toString()}`);
    },
    [router, searchParams, academyId],
  );

  const handleApply = useCallback(
    (filters: { from?: string; to?: string; actionType?: AuditActionType }) => {
      updateUrl({
        from: filters.from,
        to: filters.to,
        actionType: filters.actionType,
        page: '1',
      });
    },
    [updateUrl],
  );

  const handleClear = useCallback(() => {
    router.push(`/academies/${academyId}/audit-logs`);
  }, [router, academyId]);

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrl({ page: String(page) });
    },
    [updateUrl],
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      updateUrl({ pageSize: String(pageSize), page: '1' });
    },
    [updateUrl],
  );

  return (
    <div>
      <div className={styles.headerBlock}>
        <Link href={`/academies/${academyId}`} className={styles.backLink}>
          &larr; Back to Academy
        </Link>
        <h1 className={styles.heading}>Audit Logs</h1>
      </div>

      <AuditLogsFilters
        from={query.from}
        to={query.to}
        actionType={query.actionType}
        onApply={handleApply}
        onClear={handleClear}
      />

      {error && (
        <div className={styles.alertWrapper}>
          <Alert
            variant="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {error.code === 'NOT_FOUND' ? 'Academy not found' : error.message}
          </Alert>
        </div>
      )}

      <AuditLogsTable items={data?.items ?? []} loading={loading} />

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          totalItems={data.meta.totalItems}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemSingular="entry"
          itemPlural="entries"
          pageSizeOptions={AUDIT_PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
  );
}
