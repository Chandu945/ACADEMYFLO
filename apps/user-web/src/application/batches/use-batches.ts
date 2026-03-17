'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type BatchListItem = {
  id: string;
  batchName: string;
  days: string[];
  notes: string | null;
  profilePhotoUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  maxStudents: number | null;
  status: string;
  studentCount: number;
  createdAt: string;
};

export function useBatches(search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/batches?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const json = await res.json();
      setData(json.data ?? json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createBatch(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/batches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message };
  return { ok: true as const, data: json };
}

export async function updateBatch(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/batches/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message };
  return { ok: true as const, data: json };
}

export async function deleteBatch(id: string, accessToken?: string | null) {
  const res = await fetch(`/api/batches/${id}`, {
    method: 'DELETE',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false as const, error: json.message };
  }
  return { ok: true as const };
}
