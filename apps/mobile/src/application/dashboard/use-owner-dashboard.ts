import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  OwnerDashboardRange,
  OwnerDashboardKpis,
} from '../../domain/dashboard/dashboard.types';
import type { AppError } from '../../domain/common/errors';
import {
  getOwnerDashboardUseCase,
  type DashboardApiPort,
} from './use-cases/get-owner-dashboard.usecase';

type UseOwnerDashboardResult = {
  data: OwnerDashboardKpis | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => Promise<void>;
};

export function useOwnerDashboard(
  range: OwnerDashboardRange,
  dashboardApi: DashboardApiPort,
): UseOwnerDashboardResult {
  const [data, setData] = useState<OwnerDashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getOwnerDashboardUseCase({ dashboardApi }, range);

      if (!mountedRef.current) return;

      if (result.ok) {
        setData(result.value);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[useOwnerDashboard] Fetch failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Failed to load dashboard. Pull to retry.' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [range, dashboardApi]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => {
      mountedRef.current = false;
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
