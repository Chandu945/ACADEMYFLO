'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubscriptionStatus, TierKey } from '@playconnect/contracts';
import { useAuth } from '@/application/auth/use-auth';

type SubscriptionInfo = { status: SubscriptionStatus; trialEndAt: string; paidEndAt: string | null; tierKey: TierKey | null; daysRemaining: number; canAccessApp: boolean; blockReason: string | null; activeStudentCount: number; currentTierKey: TierKey | null; requiredTierKey: TierKey; tiers: { key: TierKey; label: string; priceInr: number; maxStudents: number | null }[] };

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try { return await res.json(); } catch { return null; }
}

export function useSubscription() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<SubscriptionInfo | null>(null);
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
      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (controller.signal.aborted) return;
      const json = await safeJson(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !json) throw new Error((json?.['message'] as string) || 'Failed to load subscription');
      setData(json as unknown as SubscriptionInfo);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load subscription');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetch_(); return () => { abortRef.current?.abort(); }; }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function initiatePayment(tierKey: string, accessToken?: string | null) {
  try {
    const res = await fetch('/api/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ tierKey }), signal: AbortSignal.timeout(15000) });
    const json = await safeJson(res);
    if (!res.ok || !json) return { ok: false as const, error: (json?.['message'] as string) || 'Failed to initiate payment' };
    return { ok: true as const, data: json };
  } catch { return { ok: false as const, error: 'Network error. Please try again.' }; }
}
