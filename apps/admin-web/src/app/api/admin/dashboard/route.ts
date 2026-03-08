import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

type BackendDashboard = {
  totalAcademies: number;
  trialAcademies: number;
  paidAcademies: number;
  expiredGraceAcademies: number;
  blockedAcademies: number;
  disabledAcademies: number;
};

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await apiGet<BackendDashboard>('/api/v1/admin/dashboard', { accessToken });

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const backend = result.data;
  return NextResponse.json({
    success: true,
    data: {
      totalAcademies: backend.totalAcademies,
      activeTrials: backend.trialAcademies,
      activePaid: backend.paidAcademies,
      expiredGrace: backend.expiredGraceAcademies,
      blocked: backend.blockedAcademies,
      disabled: backend.disabledAcademies,
    },
  });
}
