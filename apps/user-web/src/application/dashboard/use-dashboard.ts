'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

export type DashboardKpis = {
  totalStudents: number;
  newAdmissions: number;
  inactiveStudents: number;
  pendingPaymentRequests: number;
  totalCollected: number;
  totalPendingAmount: number;
  todayAbsentCount: number;
  dueStudentsCount: number;
  todayPresentCount: number;
  totalExpenses: number;
};

type BirthdayStudent = {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  guardianMobile: string;
};

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Safely coerce a value to a non-NaN number, defaulting to 0. */
function safeNumber(val: unknown): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  return 0;
}

/** Validate and normalise a raw KPI response into a safe DashboardKpis object. */
function parseKpis(raw: Record<string, unknown>): DashboardKpis {
  return {
    totalStudents: safeNumber(raw['totalStudents']),
    newAdmissions: safeNumber(raw['newAdmissions']),
    inactiveStudents: safeNumber(raw['inactiveStudents']),
    pendingPaymentRequests: safeNumber(raw['pendingPaymentRequests']),
    totalCollected: safeNumber(raw['totalCollected']),
    totalPendingAmount: safeNumber(raw['totalPendingAmount']),
    todayAbsentCount: safeNumber(raw['todayAbsentCount']),
    dueStudentsCount: safeNumber(raw['dueStudentsCount']),
    todayPresentCount: safeNumber(raw['todayPresentCount']),
    totalExpenses: safeNumber(raw['totalExpenses']),
  };
}

/** Validate a single birthday student entry has required fields. */
function isValidBirthdayStudent(item: unknown): item is BirthdayStudent {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj['id'] === 'string' && typeof obj['fullName'] === 'string';
}

export function useDashboardKpis(preset = 'THIS_MONTH') {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DashboardKpis | null>(null);
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
      const res = await fetch(`/api/dashboard?preset=${preset}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load dashboard');
      }
      setData(parseKpis(json));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, preset]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useBirthdays(scope: 'today' | 'month' = 'today') {
  const { accessToken } = useAuth();
  const [data, setData] = useState<BirthdayStudent[]>([]);
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
      const res = await fetch(`/api/dashboard?type=birthdays&scope=${scope}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load birthdays');
      }

      const rawStudents = Array.isArray(json)
        ? json
        : Array.isArray((json as Record<string, unknown>)['students'])
          ? (json as Record<string, unknown>)['students']
          : [];
      setData((rawStudents as unknown[]).filter(isValidBirthdayStudent));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load birthdays');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, scope]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
