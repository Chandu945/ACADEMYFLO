'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AppError } from '@/domain/common/errors';
import { useAdminAuth } from '@/application/auth/use-admin-auth';
import { getAdminRevenue } from './admin-revenue.service';
import type { AdminRevenuePayload } from './admin-revenue.schemas';

type UseAdminRevenueReturn = {
  data: AdminRevenuePayload | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => void;
};

export function useAdminRevenue(): UseAdminRevenueReturn {
  const { accessToken } = useAdminAuth();
  const [data, setData] = useState<AdminRevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [bumper, setBumper] = useState(0);

  const refetch = useCallback(() => setBumper((b) => b + 1), []);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getAdminRevenue(token);
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error);
        if (result.error.code === 'UNAUTHORIZED') {
          window.location.href = '/login';
          return;
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, bumper]);

  return { data, loading, error, refetch };
}
