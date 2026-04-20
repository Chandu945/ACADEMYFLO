import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { toErrorResponse } from '@/infra/http/error-mapper';

export async function GET(request: NextRequest) {
  // Rate limiting delegated to upstream NestJS api. Prior per-process Map
  // didn't scale across replicas and lost state on restart.

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'kpis';

  if (type === 'chart') {
    const year = searchParams.get('year') || String(new Date().getFullYear());
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ message: 'year must be a 4-digit number' }, { status: 400 });
    }
    const params = buildSafeParams({ year });
    const result = await apiGet(`/api/v1/dashboard/monthly-chart?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'birthdays') {
    const scope = searchParams.get('scope') || 'today';
    if (!['today', 'week', 'month'].includes(scope)) {
      return NextResponse.json({ message: 'scope must be today, week, or month' }, { status: 400 });
    }
    const params = buildSafeParams({ scope });
    const result = await apiGet(`/api/v1/dashboard/birthdays?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const preset = searchParams.get('preset');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Both-or-neither + format validation. Server enforces calendar validity
  // and ordering; we just gate obvious garbage at the BFF.
  if ((from && !to) || (!from && to)) {
    return NextResponse.json({ message: 'from and to must be provided together' }, { status: 400 });
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (from && !dateRe.test(from)) {
    return NextResponse.json({ message: 'from must be YYYY-MM-DD' }, { status: 400 });
  }
  if (to && !dateRe.test(to)) {
    return NextResponse.json({ message: 'to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ message: 'from must be on or before to' }, { status: 400 });
  }
  if (preset && preset !== 'THIS_MONTH') {
    return NextResponse.json({ message: 'preset must be THIS_MONTH' }, { status: 400 });
  }

  const params = buildSafeParams({ preset: preset || undefined, from: from || undefined, to: to || undefined });
  const path = params.toString() ? `/api/v1/dashboard/owner?${params}` : '/api/v1/dashboard/owner?preset=THIS_MONTH';
  const result = await apiGet(path, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
