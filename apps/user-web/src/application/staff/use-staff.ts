'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

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
  qualificationInfo: { qualification: string | null; position: string | null } | null;
  salaryConfig: { amount: number | null; frequency: string } | null;
  createdAt: string;
};

export function useStaff() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const json = await res.json();
      setData(json.data ?? json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createStaff(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message };
  return { ok: true as const, data: json };
}

export async function updateStaff(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/staff/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message };
  return { ok: true as const, data: json };
}

export async function toggleStaffStatus(id: string, status: string, accessToken?: string | null) {
  const res = await fetch(`/api/staff/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ statusChange: true, status }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false as const, error: json.message };
  return { ok: true as const, data: json };
}
