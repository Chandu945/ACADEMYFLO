'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type AuditLogItem = { id: string; actorName: string | null; action: string; entityType: string; entityId: string; context: Record<string, string> | null; createdAt: string };

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try { return await res.json(); } catch { return null; }
}

export function useAuditLogs(filters: { action?: string; entityType?: string; page?: number; from?: string; to?: string } = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { action, entityType, page, from, to } = filters;

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (page) params.set('page', String(page));
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load audit logs');
      setData((json['data'] ?? json['items'] ?? []) as AuditLogItem[]);
      setMeta((json['meta'] as { page: number; totalPages: number }) ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, action, entityType, page, from, to]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, meta, loading, error, refetch: fetch_ };
}
