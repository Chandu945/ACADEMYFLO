'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type AcademySettings = { defaultDueDateDay: number; receiptPrefix: string; lateFeeEnabled: boolean; gracePeriodDays: number; lateFeeAmountInr: number; lateFeeRepeatIntervalDays: number };
type InstituteInfo = { signatureStampUrl: string | null; bankDetails: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string; branchName: string } | null; upiId: string | null; qrCodeImageUrl: string | null };

export function useAcademySettings() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AcademySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings/academy', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function updateAcademySettings(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/settings/academy', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export function useInstituteInfo() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<InstituteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings/institute-info', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function updateInstituteInfo(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/settings/institute-info', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}
