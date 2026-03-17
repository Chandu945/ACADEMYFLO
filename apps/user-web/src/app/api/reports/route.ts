import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'monthly-revenue';

  if (type === 'monthly-revenue') {
    const params = buildSafeParams({ month: searchParams.get('month') || undefined });
    const result = await apiGet(`/api/v1/reports/monthly-revenue?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'student-wise-dues') {
    const params = buildSafeParams({
      month: searchParams.get('month') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });
    const result = await apiGet(`/api/v1/reports/student-wise-dues?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'month-wise-dues') {
    const params = buildSafeParams({ month: searchParams.get('month') || undefined });
    const result = await apiGet(`/api/v1/reports/month-wise-dues?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  return NextResponse.json({ message: 'Unknown report type' }, { status: 400 });
}
