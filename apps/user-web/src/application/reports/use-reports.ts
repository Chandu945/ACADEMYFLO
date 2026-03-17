'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type MonthlyRevenue = { collectedAmount: number; pendingAmount: number; totalStudents: number; paidStudents: number; unpaidStudents: number };
type StudentWiseDue = { studentId: string; studentName: string; monthlyFee: number; dueAmount: number; status: string };

export function useMonthlyRevenue(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MonthlyRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'monthly-revenue' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/reports?${params}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useStudentWiseDues(month?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentWiseDue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'student-wise-dues', page: String(page) });
      if (month) params.set('month', month);
      const res = await fetch(`/api/reports?${params}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } finally { setLoading(false); }
  }, [accessToken, month, page]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}
