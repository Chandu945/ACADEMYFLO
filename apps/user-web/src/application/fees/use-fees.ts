'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type FeeDueItem = {
  id: string;
  studentId: string;
  studentName: string | null;
  monthKey: string;
  dueDate: string;
  amount: number;
  lateFee: number;
  totalPayable: number;
  status: string;
  paidAt: string | null;
  paidSource: string | null;
  paymentLabel: string | null;
  createdAt: string;
};

type PaymentRequestItem = {
  id: string;
  studentId: string;
  studentName: string | null;
  feeDueId: string;
  monthKey: string;
  amount: number;
  staffUserId: string;
  staffName: string | null;
  staffNotes: string;
  status: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export function useFeeDues(month?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<FeeDueItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/fees/dues?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json.items ?? json.data ?? []);
      setMeta(json.meta ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, [accessToken, month, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, meta, loading, error, refetch: fetch_ };
}

export function usePaidFees(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<FeeDueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      const res = await fetch(`/api/fees/paid?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : json.items ?? json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

export function usePaymentRequests(status?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<PaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/fees/payment-requests?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : json.items ?? json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, status]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

export async function markFeePaid(studentId: string, month: string, paymentLabel: string, accessToken?: string | null) {
  const res = await fetch(`/api/fees/students/${studentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ month, paymentLabel }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false as const, error: json.message };
  }
  return { ok: true as const, data: json };
}

export async function handlePaymentRequest(requestId: string, action: string, data?: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/fees/payment-requests/${requestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false as const, error: json.message };
  }
  return { ok: true as const };
}
