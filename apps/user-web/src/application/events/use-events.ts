'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  status: string;
  targetAudience: string | null;
  createdAt: string;
};

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useEvents(filters: { status?: string; eventType?: string } = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { status, eventType } = filters;

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (eventType) params.set('eventType', eventType);
      const res = await fetch(`/api/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load events');
      setData((json['data'] ?? json['items'] ?? []) as EventListItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, status, eventType]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export function useEventDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setData(null); setError(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load event');
      setData(json as unknown as EventListItem);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load event');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function createEvent(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to create event', fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function updateEvent(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update event' };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteEvent(id: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to delete event' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
