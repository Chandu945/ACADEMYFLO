import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { MonthlyRevenueSummary } from '../../domain/reports/reports.types';
import { getMonthlyRevenueUseCase } from './use-cases/get-monthly-revenue.usecase';
import type { GetMonthlyRevenueApiPort } from './use-cases/get-monthly-revenue.usecase';

export type ReportsApiDeps = GetMonthlyRevenueApiPort;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useReports(api: ReportsApiDeps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [revenue, setRevenue] = useState<MonthlyRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (targetMonth: string) => {
      setLoading(true);
      setError(null);

      const revResult = await getMonthlyRevenueUseCase({ reportsApi: api }, targetMonth);

      if (!mountedRef.current) return;

      if (!revResult.ok) {
        setError(revResult.error);
        setLoading(false);
        return;
      }

      setRevenue(revResult.value);
      setLoading(false);
    },
    [api],
  );

  useEffect(() => {
    load(month);
  }, [month, load]);

  const refetch = useCallback(() => load(month), [month, load]);

  return { month, setMonth, revenue, loading, error, refetch };
}
