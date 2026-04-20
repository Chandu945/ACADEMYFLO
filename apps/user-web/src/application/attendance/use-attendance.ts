'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';

type AttendanceItem = {
  studentId: string;
  fullName: string;
  status: 'PRESENT' | 'ABSENT' | 'HOLIDAY';
};

type AttendancePage = {
  date: string;
  isHoliday: boolean;
  data: AttendanceItem[];
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

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useDailyAttendance(date: string, batchId?: string, search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AttendancePage | null>(null);
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
      const params = new URLSearchParams({ date, pageSize: '100' });
      if (batchId) params.set('batchId', batchId);
      if (search) params.set('search', search);
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load attendance');
      }
      setData(json as unknown as AttendancePage);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, date, batchId, search]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function markAttendance(studentId: string, date: string, status: string, accessToken?: string | null) {
  try {
    const res = await fetch('/api/attendance', {
      method: 'PUT',
      headers: csrfHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      body: JSON.stringify({ studentId, date, status }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to mark attendance' };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function markBulkAttendance(date: string, updates: { studentId: string; status: string }[], accessToken?: string | null) {
  try {
    const res = await fetch('/api/attendance', {
      method: 'PUT',
      headers: csrfHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      body: JSON.stringify({ bulk: true, date, updates }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to mark bulk attendance' };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export function useMonthlySummary(month: string, search?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlySummaryItem[]>([]);
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
      const params = new URLSearchParams({ type: 'monthly-summary', month, pageSize: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load summary');
      }
      const items = (json['data'] ?? json['items'] ?? json) as MonthlySummaryItem[];
      setData(Array.isArray(items) ? items : []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, month, search]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

/* ── Student Monthly Attendance ──────────────────────────────────────── */

type StudentMonthlyData = {
  studentId: string;
  month: string;
  absentDates: string[];
  holidayDates: string[];
  presentCount: number;
  absentCount: number;
  holidayCount: number;
};

export function useStudentMonthlyAttendance(studentId: string, month: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentMonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken || !studentId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: 'student-monthly', studentId, month });
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load student attendance');
      }
      setData(json as unknown as StudentMonthlyData);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load student attendance');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, studentId, month]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

/* ── Remove Holiday ─────────────────────────────────────────────────── */

export async function removeHoliday(date: string, accessToken?: string | null) {
  try {
    const params = new URLSearchParams({ date });
    const res = await fetch(`/api/attendance/holidays?${params}`, {
      method: 'DELETE',
      headers: csrfHeaders({
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to remove holiday' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export function useMonthDailyCounts(month: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DailyCountItem[]>([]);
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
      const params = new URLSearchParams({ type: 'month-daily-counts', month });
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load daily counts');
      }
      const items = Array.isArray(json) ? json : (json['days'] ?? []);
      setData(items as DailyCountItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load daily counts');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
