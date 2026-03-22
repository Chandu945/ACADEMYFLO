'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useFeeDues(month?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<FeeDueItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
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
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/fees/dues?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load fees');
      }
      setData((json['items'] ?? json['data'] ?? []) as FeeDueItem[]);
      setMeta((json['meta'] as { total: number; totalPages: number }) ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load fees');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, month, page]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, meta, loading, error, refetch: fetch_ };
}

export function usePaidFees(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<FeeDueItem[]>([]);
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
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      const res = await fetch(`/api/fees/paid?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load paid fees');
      }
      const items = Array.isArray(json) ? json : (json['items'] ?? json['data'] ?? []);
      setData(items as FeeDueItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load paid fees');
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

export function usePaymentRequests(status?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<PaymentRequestItem[]>([]);
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
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/fees/payment-requests?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load payment requests');
      }
      const items = Array.isArray(json) ? json : (json['items'] ?? json['data'] ?? []);
      setData(items as PaymentRequestItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load payment requests');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, status]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function markFeePaid(studentId: string, month: string, paymentLabel: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/fees/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ month, paymentLabel }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to mark fee as paid' };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function handlePaymentRequest(requestId: string, action: string, data?: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/fees/payment-requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ action, ...data }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || `Failed to ${action.toLowerCase()} request` };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
