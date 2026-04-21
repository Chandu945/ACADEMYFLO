import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPost } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const params = buildSafeParams({
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '50',
  });
  const result = await apiGet(`/api/v1/staff?${params}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: 'Request body must be an object' }, { status: 400 });
  }
  const result = await apiPost('/api/v1/staff', body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data, { status: 201 });
}
