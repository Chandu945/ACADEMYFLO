'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type AttendanceItem = {
  studentId: string;
  fullName: string;
  status: 'PRESENT' | 'ABSENT' | 'HOLIDAY';
};

type AttendancePage = {
  date: string;
  isHoliday: boolean;
  items: AttendanceItem[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

type MonthlySummaryItem = {
  studentId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  holidayCount: number;
};

type DailyCountItem = { date: string; presentCount: number; absentCount: number; isHoliday: boolean };

export function useDailyAttendance(date: string, batchId?: string, search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AttendancePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(0);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    const id = ++cancelRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date, pageSize: '200' });
      if (batchId) params.set('batchId', batchId);
      if (search) params.set('search', search);
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (id !== cancelRef.current) return;
      if (!res.ok) throw new Error((await res.json()).message);
      setData(await res.json());
    } catch (e) {
      if (id !== cancelRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      if (id === cancelRef.current) setLoading(false);
    }
  }, [accessToken, date, batchId, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function markAttendance(studentId: string, date: string, status: string, accessToken?: string | null) {
  const res = await fetch('/api/attendance', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ studentId, date, status }),
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false as const, error: json.message };
  }
  return { ok: true as const, data: await res.json() };
}

export async function markBulkAttendance(date: string, updates: { studentId: string; status: string }[], accessToken?: string | null) {
  const res = await fetch('/api/attendance', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ bulk: true, date, updates }),
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false as const, error: json.message };
  }
  return { ok: true as const, data: await res.json() };
}

export function useMonthlySummary(month: string, search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelRef = useRef(0);

  const fetch_ = useCallback(async () => {
    const id = ++cancelRef.current;
    setLoading(true);
    try {
      if (!accessToken) return;
      const params = new URLSearchParams({ type: 'monthly-summary', month, pageSize: '200' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (id !== cancelRef.current) return;
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json.items ?? json ?? []);
      }
    } finally {
      if (id === cancelRef.current) setLoading(false);
    }
  }, [accessToken, month, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

export function useMonthDailyCounts(month: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DailyCountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      if (!accessToken) return;
      const params = new URLSearchParams({ type: 'month-daily-counts', month });
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : json.days ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}
