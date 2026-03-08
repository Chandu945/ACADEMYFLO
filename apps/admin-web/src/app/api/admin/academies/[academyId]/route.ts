import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

type BackendDetailResponse = {
  academyId: string;
  academyName: string;
  loginDisabled: boolean;
  owner: { fullName: string; email: string; phoneNumber: string };
  subscription: {
    status: string;
    tierKey: string | null;
    pendingTierKey: string | null;
    pendingTierEffectiveAt: string | null;
    trialEndAt: string | null;
    paidStartAt: string | null;
    paidEndAt: string | null;
    manualNotes: string | null;
    paymentReference: string | null;
  };
  metrics: {
    activeStudentCount: number;
    staffCount: number;
    thisMonthRevenueTotal: number;
  };
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ academyId: string }> },
) {
  const { academyId } = await context.params;

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await apiGet<BackendDetailResponse>(
    `/api/v1/admin/academies/${encodeURIComponent(academyId)}`,
    { accessToken },
  );

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (result.error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
