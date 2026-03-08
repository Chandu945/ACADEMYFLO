import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { MonthlyRevenueSummary, StudentWiseDueItem } from '../../domain/reports/reports.types';
import { getMonthlyRevenueUseCase } from './use-cases/get-monthly-revenue.usecase';
import { getStudentWiseDuesUseCase } from './use-cases/get-student-wise-dues.usecase';
import type { GetMonthlyRevenueApiPort } from './use-cases/get-monthly-revenue.usecase';
import type { GetStudentWiseDuesApiPort } from './use-cases/get-student-wise-dues.usecase';

export type ReportsApiDeps = GetMonthlyRevenueApiPort & GetStudentWiseDuesApiPort;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useReports(api: ReportsApiDeps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [revenue, setRevenue] = useState<MonthlyRevenueSummary | null>(null);
  const [pendingDues, setPendingDues] = useState<StudentWiseDueItem[]>([]);
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

      const [revResult, duesResult] = await Promise.all([
        getMonthlyRevenueUseCase({ reportsApi: api }, targetMonth),
        getStudentWiseDuesUseCase({ reportsApi: api }, targetMonth),
      ]);

      if (!mountedRef.current) return;

      if (!revResult.ok) {
        setError(revResult.error);
        setLoading(false);
        return;
      }
      if (!duesResult.ok) {
        setError(duesResult.error);
        setLoading(false);
        return;
      }

      setRevenue(revResult.value);
      setPendingDues(duesResult.value);
      setLoading(false);
    },
    [api],
  );

  useEffect(() => {
    load(month);
  }, [month, load]);

  const refetch = useCallback(() => load(month), [month, load]);

  return { month, setMonth, revenue, pendingDues, loading, error, refetch };
}
