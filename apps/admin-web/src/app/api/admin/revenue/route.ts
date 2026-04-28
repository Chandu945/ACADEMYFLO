import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

type BackendResponse = {
  asOf: string;
  activePaidCount: number;
  mrrInr: number;
  arrInr: number;
  activeTrialCount: number;
  tierDistribution: Array<{ tierKey: string; count: number; mrrInr: number }>;
  thisMonth: { label: string; newPaidCount: number; newPaidMrrInr: number };
  conversion30d: { signups: number; converted: number; rate: number | null };
};

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await apiGet<BackendResponse>('/api/v1/admin/revenue', { accessToken });

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
