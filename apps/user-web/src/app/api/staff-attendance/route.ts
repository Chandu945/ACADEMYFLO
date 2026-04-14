import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'daily';

  if (type === 'daily-report') {
    const params = buildSafeParams({ date: searchParams.get('date') || undefined });
    const result = await apiGet(`/api/v1/staff-attendance/reports/daily?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'monthly') {
    const params = buildSafeParams({
      month: searchParams.get('month') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '50',
    });
    const result = await apiGet(`/api/v1/staff-attendance/reports/monthly?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const params = buildSafeParams({
    date: searchParams.get('date') || undefined,
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '50',
  });
  const result = await apiGet(`/api/v1/staff-attendance?${params}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function PUT(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const staffId = body['staffUserId'] ?? body['staffId'];
  if (!staffId || typeof staffId !== 'string') {
    return NextResponse.json({ message: 'staffUserId or staffId is required' }, { status: 400 });
  }
  const date = body['date'];
  if (!date || typeof date !== 'string') {
    return NextResponse.json({ message: 'date is required' }, { status: 400 });
  }
  const result = await apiPut(`/api/v1/staff-attendance/${encodeURIComponent(staffId)}?date=${encodeURIComponent(date)}`, { status: body['status'] }, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
