'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';

type StaffListItem = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  startDate: string | null;
  gender: string | null;
  profilePhotoUrl: string | null;
  whatsappNumber: string | null;
  mobileNumber: string | null;
  address: string | null;
  qualificationInfo: { qualification: string | null; position: string | null } | null;
  salaryConfig: { amount: number | null; frequency: string } | null;
  createdAt: string;
};

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useStaff() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cross-account safety: clear cache when the authenticated user changes
  // (logout/login as a different owner). Mirrors the mobile use-students fix.
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setData([]);
      setError(null);
    }
  }, [userId]);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load staff');
      }
      setData((json['data'] ?? json['items'] ?? []) as StaffListItem[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load staff');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  return { data, setData, loading, error, refetch: fetch_ };
}

export function useStaffDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StaffListItem | null>(null);
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
      const res = await fetch(`/api/staff/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;

      const json = await safeJson(res);
      if (controller.signal.aborted) return;

      if (!res.ok || !json) {
        throw new Error((json?.['message'] as string) || 'Failed to load staff member');
      }
      setData(json as unknown as StaffListItem);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load staff member');
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

export async function createStaff(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: csrfHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return {
        ok: false as const,
        error: (json?.['message'] as string) || 'Failed to create staff',
        fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined,
      };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function updateStaff(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: csrfHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return {
        ok: false as const,
        error: (json?.['message'] as string) || 'Failed to update staff',
        fieldErrors: json?.['fieldErrors'] as Record<string, string> | undefined,
      };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}

export async function toggleStaffStatus(id: string, status: string, accessToken?: string | null) {
  try {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: csrfHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      body: JSON.stringify({ statusChange: true, status }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await safeJson(res);
    if (!res.ok || !json) {
      return { ok: false as const, error: (json?.['message'] as string) || 'Failed to update status' };
    }
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: 'Network error. Please try again.' };
  }
}
