'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type SubscriptionInfo = { status: string; trialEndAt: string; paidEndAt: string | null; tierKey: string | null; daysRemaining: number; canAccessApp: boolean; blockReason: string | null; activeStudentCount: number; currentTierKey: string | null; requiredTierKey: string; tiers: { key: string; label: string; priceInr: number; maxStudents: number | null }[] };

export function useSubscription() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription', { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function initiatePayment(tierKey: string, accessToken?: string | null) {
  const res = await fetch('/api/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ tierKey }) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}
