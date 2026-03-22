import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { MonthlyRevenueSummary } from '../../domain/reports/reports.types';
import { getMonthlyRevenueUseCase } from './use-cases/get-monthly-revenue.usecase';
import type { GetMonthlyRevenueApiPort } from './use-cases/get-monthly-revenue.usecase';
import { getCurrentMonthIST } from '../../domain/common/date-utils';

export type ReportsApiDeps = GetMonthlyRevenueApiPort;

function currentMonthKey(): string {
  return getCurrentMonthIST();
}

export function useReports(api: ReportsApiDeps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [revenue, setRevenue] = useState<MonthlyRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (targetMonth: string) => {
      setLoading(true);
      setError(null);

      try {
        const revResult = await getMonthlyRevenueUseCase({ reportsApi: api }, targetMonth);

        if (!mountedRef.current) return;

        if (!revResult.ok) {
          setError(revResult.error);
          return;
        }

        setRevenue(revResult.value);
      } catch (e) {
        if (__DEV__) console.error('[useReports] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [api],
  );

  useEffect(() => {
    load(month);
  }, [month, load]);

  const refetch = useCallback(() => load(month), [month, load]);

  return { month, setMonth, revenue, loading, error, refetch };
}
