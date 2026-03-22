'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

export type StudentListItem = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  guardian: { name: string; mobile: string; email: string } | null;
  joiningDate: string;
  monthlyFee: number;
  mobileNumber: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
  fatherName: string | null;
  motherName: string | null;
  whatsappNumber: string | null;
  addressText: string | null;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type PageMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type StudentFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  feeFilter?: string;
  month?: string;
  batchId?: string;
};

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useStudents(filters: StudentFilters = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { page, pageSize, status, search, feeFilter, month, batchId } = filters;

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (page != null) params.set('page', String(page));
      if (pageSize != null) params.set('pageSize', String(pageSize));
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (feeFilter) params.set('feeFilter', feeFilter);
      if (month) params.set('month', month);
      if (batchId) params.set('batchId', batchId);

      const res = await fetch(`/api/students?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load students');
      }
      setData((json['data'] ?? json['items'] ?? []) as StudentListItem[]);
      setMeta((json['meta'] as PageMeta) ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, page, pageSize, status, search, feeFilter, month, batchId]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, meta, loading, error, refetch: fetch_ };
}

export function useStudentDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setData(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load student');
      }
      setData(json as unknown as StudentListItem);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load student');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createStudent(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return {
        ok: false as const,
        error: (json?.['message'] as string) || 'Failed to create student',
        fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined,
      };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function updateStudent(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update student' };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function deleteStudent(id: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await safeJson(res);
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to delete' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
