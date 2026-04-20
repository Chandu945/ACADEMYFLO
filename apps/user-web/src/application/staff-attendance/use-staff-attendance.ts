'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';

type StaffAttendanceItem = { staffUserId: string; fullName: string; status: string };
type MonthlyStaffSummary = { staffUserId: string; fullName: string; presentCount: number; absentCount: number; holidayCount: number };

export function useDailyStaffAttendance(date: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StaffAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      const res = await fetch(`/api/staff-attendance?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken, date]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useMonthlyStaffSummary(month: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlyStaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'monthly', month });
      const res = await fetch(`/api/staff-attendance?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; } finally { setLoading(false); }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function markStaffAttendance(staffUserId: string, date: string, status: string, accessToken?: string | null) {
  try {
    const res = await fetch('/api/staff-attendance', { method: 'PUT', headers: csrfHeaders({ 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }), body: JSON.stringify({ staffUserId, date, status }) });
    const json = await res.json();
    return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}
