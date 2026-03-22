'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type AcademySettings = { defaultDueDateDay: number; receiptPrefix: string; lateFeeEnabled: boolean; gracePeriodDays: number; lateFeeAmountInr: number; lateFeeRepeatIntervalDays: number };
type InstituteInfo = { signatureStampUrl: string | null; bankDetails: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string; branchName: string } | null; upiId: string | null; qrCodeImageUrl: string | null };

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try { return await res.json(); } catch { return null; }
}

export function useAcademySettings() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AcademySettings | null>(null);
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
      const res = await fetch('/api/settings/academy', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load settings');
      setData(json as unknown as AcademySettings);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function updateAcademySettings(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/settings/academy', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to save settings' };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}

export function useInstituteInfo() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<InstituteInfo | null>(null);
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
      const res = await fetch('/api/settings/institute-info', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load institute info');
      setData(json as unknown as InstituteInfo);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load institute info');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function updateInstituteInfo(body: Record<string, unknown>, accessToken?: string | null) {
  try {
    const res = await fetch('/api/settings/institute-info', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to save institute info' };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}
