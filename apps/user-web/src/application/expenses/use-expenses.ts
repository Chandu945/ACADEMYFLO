'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type ExpenseItem = { id: string; date: string; categoryId: string; categoryName: string; amount: number; notes: string | null; createdAt: string };
type ExpenseCategory = { id: string; name: string };
type ExpenseSummary = { categories: { category: string; total: number }[]; totalAmount: number };

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useExpenses(month?: string, categoryId?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseItem[]>([]);
  const [meta, setMeta] = useState<{ totalItems: number; totalPages: number } | null>(null);
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
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load expenses');
      setData((json['data'] ?? []) as ExpenseItem[]);
      setMeta((json['meta'] as { totalItems: number; totalPages: number }) ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, month, categoryId, page]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, meta, loading, error, refetch: fetch_ };
}

export function useExpenseSummary(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseSummary | null>(null);
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
      const params = new URLSearchParams({ type: 'summary' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load summary');
      setData(json as unknown as ExpenseSummary);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export function useExpenseCategories() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch('/api/expenses/categories', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (res.ok && json) {
        setData(Array.isArray(json) ? json as ExpenseCategory[] : (json['data'] ?? []) as ExpenseCategory[]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function createExpense(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to create expense' };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function updateExpense(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify({ id, ...body }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update expense' };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteExpense(id: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/expenses?id=${id}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to delete expense' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
