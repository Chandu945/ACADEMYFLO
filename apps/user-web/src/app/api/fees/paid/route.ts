import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { buildSafeParams } from '@/infra/http/query-sanitizer';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const params = buildSafeParams({
    month: searchParams.get('month') || undefined,
    batchId: searchParams.get('batchId') || undefined,
  });
  const result = await apiGet(`/api/v1/fees/paid?${params}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
