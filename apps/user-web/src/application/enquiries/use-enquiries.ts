'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';

type EnquiryListItem = { id: string; prospectName: string; mobileNumber: string; source: string | null; status: string; nextFollowUpDate: string | null; createdAt: string };
type EnquiryDetail = EnquiryListItem & { guardianName: string | null; whatsappNumber: string | null; email: string | null; address: string | null; interestedIn: string | null; notes: string | null; closureReason: string | null; convertedStudentId: string | null; followUps: { id: string; date: string; notes: string; nextFollowUpDate: string | null; createdAt: string }[]; updatedAt: string };
type EnquirySummary = { total: number; active: number; closed: number; todayFollowUp: number };

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try { return await res.json(); } catch { return null; }
}

type EnquiriesPagination = { page: number; limit: number; total: number; totalPages: number };

export function useEnquiries(
  filters: { status?: string; search?: string; page?: number; limit?: number } = {},
) {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<EnquiryListItem[]>([]);
  const [pagination, setPagination] = useState<EnquiriesPagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cross-account safety: clear cache when authenticated user changes
  // (logout + login as different owner). Mirrors useStaff F4-H3.
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setData([]);
      setError(null);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    }
  }, [userId]);

  const { status, search, page = 1, limit = 20 } = filters;

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
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await fetch(`/api/enquiries?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load enquiries');
      setData((json['data'] ?? json['items'] ?? []) as EnquiryListItem[]);
      const p = json['pagination'] as EnquiriesPagination | undefined;
      if (p) setPagination(p);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load enquiries');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, status, search, page, limit]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, pagination, loading, error, refetch: fetch_ };
}

export function useEnquirySummary() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EnquirySummary | null>(null);
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
      const res = await fetch('/api/enquiries?type=summary', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load summary');
      setData(json as unknown as EnquirySummary);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export function useEnquiryDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EnquiryDetail | null>(null);
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
      const res = await fetch(`/api/enquiries/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load enquiry');
      setData(json as unknown as EnquiryDetail);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load enquiry');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function createEnquiry(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/enquiries', { method: 'POST', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to create enquiry', fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}

export async function updateEnquiry(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}`, { method: 'PUT', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update enquiry', fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}

export async function addFollowUp(enquiryId: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(enquiryId)}/follow-ups`, { method: 'POST', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to add follow-up' };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}

export async function closeEnquiry(id: string, reason: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/close`, { method: 'PUT', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify({ closureReason: reason }), signal: AbortSignal.timeout(15000) });
    if (!res.ok) { const json = await safeJson(res); return { ok: false as const, error: (json?.['message'] as string) || 'Failed to close enquiry' }; }
    return { ok: true as const };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}

export async function convertEnquiry(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to convert enquiry' };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}
