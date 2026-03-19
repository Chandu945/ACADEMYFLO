'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type EventListItem = { id: string; title: string; description: string | null; eventType: string | null; startDate: string; endDate: string | null; startTime: string | null; endTime: string | null; isAllDay: boolean; location: string | null; status: string; createdAt: string };

export function useEvents(filters: Record<string, string | undefined> = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelRef = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    const id = ++cancelRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const currentFilters = JSON.parse(filtersKey) as Record<string, string | undefined>;
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/events?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (id !== cancelRef.current) return;
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } finally { if (id === cancelRef.current) setLoading(false); }
  }, [accessToken, filtersKey]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useEventDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(0);

  useEffect(() => { setData(null); setError(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;
    const reqId = ++cancelRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (reqId !== cancelRef.current) return;
      if (res.ok) {
        setData(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.message || `Failed to load event (${res.status})`);
      }
    } catch {
      if (reqId === cancelRef.current) setError('Network error loading event');
    } finally { if (reqId === cancelRef.current) setLoading(false); }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
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
  if (!res.ok) { const json = await res.json(); return { ok: false as const, error: json.message }; }
  return { ok: true as const };
}
