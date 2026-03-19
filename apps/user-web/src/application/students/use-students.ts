'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type StudentListItem = {
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

export function useStudents(filters: StudentFilters = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    const id = ++cancelRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const currentFilters = JSON.parse(filtersKey) as StudentFilters;
      Object.entries(currentFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const res = await fetch(`/api/students?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (id !== cancelRef.current) return;
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json.data ?? json.items ?? []);
      setMeta(json.meta ?? null);
    } catch (e) {
      if (id !== cancelRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      if (id === cancelRef.current) setLoading(false);
    }
  }, [accessToken, filtersKey]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, meta, loading, error, refetch: fetch_ };
}

export function useStudentDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentListItem | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(0);

  useEffect(() => { setData(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;
    const reqId = ++cancelRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (reqId !== cancelRef.current) return;
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json);
    } catch (e) {
      if (reqId !== cancelRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load student');
    } finally {
      if (reqId === cancelRef.current) setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createStudent(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message || 'Failed to create student', fieldErrors: json.fieldErrors };
  return { ok: true as const, data: json };
}

export async function updateStudent(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/students/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message || 'Failed to update student' };
  return { ok: true as const, data: json };
}

export async function deleteStudent(id: string, accessToken?: string | null) {
  const res = await fetch(`/api/students/${id}`, {
    method: 'DELETE',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false as const, error: json.message || 'Failed to delete' };
  }
  return { ok: true as const };
}
