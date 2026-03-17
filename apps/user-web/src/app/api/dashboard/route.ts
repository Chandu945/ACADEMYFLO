import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'kpis';

  if (type === 'chart') {
    const params = buildSafeParams({ year: searchParams.get('year') || undefined });
    const result = await apiGet(`/api/v1/dashboard/monthly-chart?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'birthdays') {
    const params = buildSafeParams({ scope: searchParams.get('scope') || 'today' });
    const result = await apiGet(`/api/v1/dashboard/birthdays?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  const preset = searchParams.get('preset');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const params = buildSafeParams({ preset: preset || undefined, from: from || undefined, to: to || undefined });
  const path = params.toString() ? `/api/v1/dashboard/owner?${params}` : '/api/v1/dashboard/owner?preset=THIS_MONTH';
  const result = await apiGet(path, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
