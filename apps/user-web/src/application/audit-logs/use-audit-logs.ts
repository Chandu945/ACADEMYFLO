'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type AuditLogItem = { id: string; actorName: string | null; action: string; entityType: string; entityId: string; context: Record<string, string> | null; createdAt: string };

export function useAuditLogs(filters: Record<string, string | undefined> = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const filtersKey = JSON.stringify(filters);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const currentFilters = JSON.parse(filtersKey) as Record<string, string | undefined>;
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/audit-logs?${params}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); setMeta(json.meta ?? null); }
    } finally { setLoading(false); }
  }, [accessToken, filtersKey]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, meta, loading, refetch: fetch_ };
}
