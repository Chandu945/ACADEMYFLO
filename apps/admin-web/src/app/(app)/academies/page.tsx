'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAcademies } from '@/application/academies/use-academies';
import { parseQuery } from '@/application/academies/query';
import type { AcademyStatusFilter, TierFilter } from '@/domain/admin/academies';
import { AcademiesFilters } from '@/components/academies/AcademiesFilters';
import { AcademiesTable } from '@/components/academies/AcademiesTable';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';
import { Pagination } from '@/components/academies/Pagination';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

import styles from './page.module.css';

export default function AcademiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, loading, error, refetch } = useAcademies(query);

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
      router.push(`/academies?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleFilterChange = useCallback(
    (filters: { status?: AcademyStatusFilter; tier?: TierFilter; search?: string }) => {
      updateUrl({
        status: filters.status,
        tier: filters.tier,
        search: filters.search,
        page: '1', // Reset to first page on filter change
      });
    },
    [updateUrl],
  );

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
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Academies</h1>
        <ExportCsvButton
          href="/api/admin/academies/export"
          params={{
            status: query.status,
            tier: query.tier,
            search: query.search,
          }}
          disabled={loading || !data || data.meta.totalItems === 0}
        />
      </div>

      <AcademiesFilters
        status={query.status}
        tier={query.tier}
        search={query.search}
        onFilterChange={handleFilterChange}
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
            {error.message}
          </Alert>
        </div>
      )}

      <AcademiesTable items={data?.items ?? []} loading={loading} />

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          totalItems={data.meta.totalItems}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
