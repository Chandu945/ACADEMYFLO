'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type EventListItem = { id: string; title: string; description: string | null; eventType: string | null; startDate: string; endDate: string | null; startTime: string | null; endTime: string | null; isAllDay: boolean; location: string | null; status: string; createdAt: string };

export function useEvents(filters: Record<string, string | undefined> = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const filtersKey = JSON.stringify(filters);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const currentFilters = JSON.parse(filtersKey) as Record<string, string | undefined>;
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/events?${params}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } finally { setLoading(false); }
  }, [accessToken, filtersKey]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useEventDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem | null>(null);
  const [loading, setLoading] = useState(!!id);

  const fetch_ = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${id}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function createEvent(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function updateEvent(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function deleteEvent(id: string, accessToken?: string | null) {
  const res = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  return res.ok ? { ok: true as const } : { ok: false as const, error: (await res.json()).message };
}
