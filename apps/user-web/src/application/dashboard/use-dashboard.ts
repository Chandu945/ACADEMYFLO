'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type DashboardKpis = {
  totalActiveStudents: number;
  newAdmissions: number;
  inactiveStudents: number;
  pendingPaymentRequests: number;
  collectedAmount: number;
  totalPendingAmount: number;
  todayAbsentCount: number;
  dueStudentsCount: number;
  todayPresentCount: number;
  totalExpenses: number;
};

type MonthlyChartPoint = {
  month: string;
  income: number;
  expense: number;
};

type BirthdayStudent = {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  guardianMobile: string;
};

export function useDashboardKpis(preset = 'THIS_MONTH') {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?preset=${preset}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [accessToken, preset]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useMonthlyChart(year?: number) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlyChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      if (!accessToken) return;
      const params = year ? `&year=${year}` : '';
      const res = await fetch(`/api/dashboard?type=chart${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [accessToken, year]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

export function useBirthdays(scope: 'today' | 'month' = 'today') {
  const { accessToken } = useAuth();
  const [data, setData] = useState<BirthdayStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      if (!accessToken) return;
      const res = await fetch(`/api/dashboard?type=birthdays&scope=${scope}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : json.students ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, scope]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}
