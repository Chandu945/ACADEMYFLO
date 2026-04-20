'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';

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
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cross-account safety: clear when authenticated user flips.
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setData([]);
      setError(null);
    }
  }, [userId]);

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
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<EventListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setData(null); setError(null); }, [id]);

  // Cross-account safety.
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setData(null);
      setError(null);
    }
  }, [userId]);

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
      headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }),
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
    const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update event', fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteEvent(id: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: csrfHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

/* ── Gallery ────────────────────────────────────────────────────────────── */

export type GalleryPhoto = {
  id: string;
  eventId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
};

export function useEventGallery(eventId: string | null) {
  const { accessToken, user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPhotos([]); setError(null); }, [eventId]);

  // Cross-account safety.
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setPhotos([]);
      setError(null);
    }
  }, [userId]);

  const fetch_ = useCallback(async () => {
    if (!eventId || !accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/gallery`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load gallery');
      setPhotos((json['data'] ?? json['items'] ?? json) as unknown as GalleryPhoto[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load gallery');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, eventId]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { photos, loading, error, refetch: fetch_ };
}

export async function uploadGalleryPhoto(eventId: string, file: File, caption?: string, accessToken?: string | null) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/gallery`, {
      method: 'POST',
      headers: csrfHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to upload photo' };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteGalleryPhoto(eventId: string, photoId: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/gallery/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
      headers: csrfHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to delete photo' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
