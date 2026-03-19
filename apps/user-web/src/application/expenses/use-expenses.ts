'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type ExpenseItem = { id: string; date: string; categoryId: string; categoryName: string; amount: number; notes: string | null; createdAt: string };
type ExpenseCategory = { id: string; name: string };
type ExpenseSummary = { categories: { category: string; total: number }[]; totalAmount: number };

export function useExpenses(month?: string, categoryId?: string, page = 1) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseItem[]>([]);
  const [meta, setMeta] = useState<{ totalItems: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (month) params.set('month', month);
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/expenses?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { const json = await res.json(); setData(json.data ?? []); setMeta(json.meta ?? null); }
    } finally { setLoading(false); }
  }, [accessToken, month, categoryId, page]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, meta, loading, refetch: fetch_ };
}

export function useExpenseSummary(month?: string) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'summary' });
      if (month) params.set('month', month);
      const res = await fetch(`/api/expenses?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken, month]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useExpenseCategories() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/categories', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { const json = await res.json(); setData(Array.isArray(json) ? json : json.data ?? []); }
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function createExpense(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function updateExpense(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ id, ...body }) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function deleteExpense(id: string, accessToken?: string | null) {
  const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  if (!res.ok) { const json = await res.json(); return { ok: false as const, error: json.message }; }
  return { ok: true as const };
}
