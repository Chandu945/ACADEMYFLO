'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AppError } from '@/domain/common/errors';
import { useAdminAuth } from '@/application/auth/use-admin-auth';
import {
  searchAdminUsers,
  type AdminUsersQuery,
} from './admin-users.service';
import type { AdminUsersPayload } from './admin-users.schemas';

type UseAdminUsersReturn = {
  data: AdminUsersPayload | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => void;
};

export function useAdminUsers(query: AdminUsersQuery): UseAdminUsersReturn {
  const { accessToken } = useAdminAuth();
  const [data, setData] = useState<AdminUsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [bumper, setBumper] = useState(0);

  const refetch = useCallback(() => setBumper((b) => b + 1), []);

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    const q: AdminUsersQuery = JSON.parse(queryKey);

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await searchAdminUsers(q, token);
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
