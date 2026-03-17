import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'daily';

  if (type === 'daily-report') {
    const params = buildSafeParams({ date: searchParams.get('date') || undefined });
    const result = await apiGet(`/api/v1/attendance/reports/daily?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'monthly-summary') {
    const params = buildSafeParams({
      month: searchParams.get('month') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '50',
      search: searchParams.get('search') || undefined,
    });
    const result = await apiGet(`/api/v1/attendance/reports/monthly/summary?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'student-monthly') {
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const result = await apiGet(`/api/v1/attendance/reports/monthly/student/${encodeURIComponent(studentId || '')}?month=${encodeURIComponent(month || '')}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  if (type === 'month-daily-counts') {
    const params = buildSafeParams({ month: searchParams.get('month') || undefined });
    const result = await apiGet(`/api/v1/attendance/reports/month-daily-counts?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  const params = buildSafeParams({
    date: searchParams.get('date') || undefined,
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '100',
    batchId: searchParams.get('batchId') || undefined,
    search: searchParams.get('search') || undefined,
  });
  const result = await apiGet(`/api/v1/attendance/students?${params}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function PUT(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (body.bulk) {
    const result = await apiPut(`/api/v1/attendance/students/bulk?date=${body.date}`, { updates: body.updates }, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  const result = await apiPut(`/api/v1/attendance/students/${encodeURIComponent(body.studentId)}?date=${encodeURIComponent(body.date)}`, { status: body.status }, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
