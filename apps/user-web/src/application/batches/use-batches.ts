'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

export type BatchListItem = {
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

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useBatches(search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/batches?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load batches');
      }
      setData((json['data'] ?? json['items'] ?? []) as BatchListItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load batches');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useBatchDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<BatchListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setData(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load batch');
      }
      setData(json as unknown as BatchListItem);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load batch');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createBatch(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return {
        ok: false as const,
        error: (json?.['message'] as string) || 'Failed to create batch',
        fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined,
      };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function updateBatch(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/batches/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return {
        ok: false as const,
        error: (json?.['message'] as string) || 'Failed to update batch',
        fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined,
      };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteBatch(id: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/batches/${id}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to delete batch' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
