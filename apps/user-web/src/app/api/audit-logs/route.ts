import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const params = buildSafeParams({
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '20',
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    action: searchParams.get('action') || undefined,
    entityType: searchParams.get('entityType') || undefined,
  });
  const result = await apiGet(`/api/v1/audit-logs?${params}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
