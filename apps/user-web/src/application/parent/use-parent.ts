'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type ChildSummary = { studentId: string; fullName: string; status: string; monthlyFee: number; currentMonthAttendancePercent: number | null };
type ParentProfile = { fullName: string; email: string; phoneNumber: string; profilePhotoUrl?: string | null };

export function useChildren() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch('/api/parent/children', { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(Array.isArray(json) ? json : json.data ?? []); }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useChildAttendance(studentId: string | null, month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!!studentId);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!studentId || !accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      const res = await fetch(`/api/parent/children/${studentId}/attendance?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) setData(await res.json());
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken, studentId, month]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useChildFees(studentId: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(!!studentId);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!studentId || !accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/children/${studentId}/fees`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(Array.isArray(json) ? json : json.data ?? []); }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken, studentId]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useParentProfile() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch('/api/parent/profile', { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) setData(await res.json());
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function usePaymentHistory() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch('/api/parent/payment-history', { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(Array.isArray(json) ? json : json.data ?? []); }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function updateParentProfile(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/parent/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
    const json = await res.json();
    return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}

export async function changeParentPassword(currentPassword: string, newPassword: string, accessToken?: string | null) {
  try {
    const res = await fetch('/api/parent/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ changePassword: true, currentPassword, newPassword }) });
    const json = await res.json();
    return res.ok ? { ok: true as const } : { ok: false as const, error: json.message };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}
