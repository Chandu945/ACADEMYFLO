'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAdminPayments } from '@/application/admin-payments/use-admin-payments';
import type { AdminPaymentsQuery } from '@/application/admin-payments/admin-payments.service';
import type { PaymentStatus } from '@/application/admin-payments/admin-payments.schemas';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AdminPaymentsFilters } from '@/components/admin-payments/AdminPaymentsFilters';
import { AdminPaymentsTable } from '@/components/admin-payments/AdminPaymentsTable';
import { Pagination } from '@/components/academies/Pagination';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';

import styles from './page.module.css';

const DEFAULT_PAGE_SIZE = 50;
const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;

function clampInt(raw: string | null, fallback: number, min: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

function parseStatus(raw: string | null): PaymentStatus | undefined {
  if (raw && (PAYMENT_STATUSES as readonly string[]).includes(raw)) return raw as PaymentStatus;
  return undefined;
}

function parseQuery(sp: URLSearchParams): AdminPaymentsQuery {
  const stuckRaw = sp.get('stuckThresholdMinutes');
  return {
    page: clampInt(sp.get('page'), 1, 1),
    pageSize: clampInt(sp.get('pageSize'), DEFAULT_PAGE_SIZE, 1),
    status: parseStatus(sp.get('status')),
    academyId: sp.get('academyId') || undefined,
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    stuckThresholdMinutes: stuckRaw ? Number.parseInt(stuckRaw, 10) : undefined,
  };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, loading, error, refetch } = useAdminPayments(query);

  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.push(`/payments?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleFiltersChange = useCallback(
    (filters: Partial<AdminPaymentsQuery>) => {
      updateUrl({
        status: filters.status,
        academyId: filters.academyId,
        from: filters.from,
        to: filters.to,
        stuckThresholdMinutes:
          filters.stuckThresholdMinutes !== undefined
            ? String(filters.stuckThresholdMinutes)
            : undefined,
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
          <h1 className={styles.title}>Subscription payments</h1>
          <p className={styles.subtitle}>
            Every order across all academies. Use status &quot;PENDING&quot; or stuck filter to find
            payments where Cashfree never settled.
          </p>
        </div>
        <div className={styles.headerActions}>
          {data && (
            <span className={styles.totalPill}>
              {data.meta.totalItems.toLocaleString('en-IN')}{' '}
              {data.meta.totalItems === 1 ? 'order' : 'orders'}
            </span>
          )}
          <ExportCsvButton
            href="/api/admin/subscription-payments/export"
            params={{
              status: query.status,
              academyId: query.academyId,
              from: query.from,
              to: query.to,
              stuckThresholdMinutes:
                query.stuckThresholdMinutes !== undefined
                  ? String(query.stuckThresholdMinutes)
                  : undefined,
            }}
            disabled={loading || !data || data.meta.totalItems === 0}
          />
        </div>
      </header>

      <AdminPaymentsFilters initial={query} onChange={handleFiltersChange} />

      {error && (
        <Alert variant="error" action={<Button size="sm" onClick={refetch}>Retry</Button>}>
          {error.message}
        </Alert>
      )}

      <AdminPaymentsTable items={data?.items ?? []} loading={loading} />

      {data && data.meta.totalItems > 0 && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          totalItems={data.meta.totalItems}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => updateUrl({ pageSize: String(size), page: '1' })}
          itemSingular="order"
          itemPlural="orders"
        />
      )}
    </div>
  );
}
