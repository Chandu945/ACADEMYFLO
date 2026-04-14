'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type MonthlyRevenue = { collectedAmount: number; pendingAmount: number; totalStudents: number; paidStudents: number; unpaidStudents: number };
type StudentWiseDue = { studentId: string; studentName: string; monthlyFee: number; dueAmount: number; status: string };

export function useMonthlyRevenue(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlyRevenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: 'monthly-revenue' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/reports?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) setData(await res.json());
      else setError('Failed to load revenue data');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError('Network error');
    } finally { setLoading(false); }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export function useStudentWiseDues(month?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentWiseDue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: 'student-wise-dues', page: String(page) });
      if (month) params.set('month', month);
      const res = await fetch(`/api/reports?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
      else setError('Failed to load dues data');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError('Network error');
    } finally { setLoading(false); }
  }, [accessToken, month, page]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}
