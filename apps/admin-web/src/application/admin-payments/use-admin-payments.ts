'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AppError } from '@/domain/common/errors';
import { useAdminAuth } from '@/application/auth/use-admin-auth';
import {
  listAdminPayments,
  type AdminPaymentsQuery,
} from './admin-payments.service';
import type { AdminPaymentsPayload } from './admin-payments.schemas';

type UseAdminPaymentsReturn = {
  data: AdminPaymentsPayload | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => void;
};

export function useAdminPayments(query: AdminPaymentsQuery): UseAdminPaymentsReturn {
  const { accessToken } = useAdminAuth();
  const [data, setData] = useState<AdminPaymentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [bumper, setBumper] = useState(0);

  const refetch = useCallback(() => setBumper((b) => b + 1), []);

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    const q: AdminPaymentsQuery = JSON.parse(queryKey);

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await listAdminPayments(q, token);
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
  }, [queryKey, accessToken, bumper]);

  return { data, loading, error, refetch };
}
