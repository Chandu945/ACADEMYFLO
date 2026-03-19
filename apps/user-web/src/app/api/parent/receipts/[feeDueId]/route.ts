import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';

type Params = { params: Promise<{ feeDueId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { feeDueId } = await params;
  const result = await apiGet(`/api/v1/parent/receipts/${encodeURIComponent(feeDueId)}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
