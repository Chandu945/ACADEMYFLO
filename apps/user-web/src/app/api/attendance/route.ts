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
    const result = await apiGet(`/api/v1/attendance/reports/daily?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
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
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'student-monthly') {
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const result = await apiGet(`/api/v1/attendance/reports/monthly/student/${encodeURIComponent(studentId || '')}?month=${encodeURIComponent(month || '')}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'month-daily-counts') {
    const params = buildSafeParams({ month: searchParams.get('month') || undefined });
    const result = await apiGet(`/api/v1/attendance/reports/month-daily-counts?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
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

  const date = body['date'];
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: 'date is required and must be in YYYY-MM-DD format' }, { status: 400 });
  }

  if (body['bulk']) {
    const updates = body['updates'] as { studentId: string; status: string }[] | undefined;
    const absentStudentIds = Array.isArray(updates)
      ? updates.filter((u) => u.status === 'ABSENT').map((u) => u.studentId)
      : [];
    const result = await apiPut(`/api/v1/attendance/students/bulk?date=${encodeURIComponent(date)}`, { absentStudentIds }, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const studentId = body['studentId'];
  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ message: 'studentId is required' }, { status: 400 });
  }

  const result = await apiPut(`/api/v1/attendance/students/${encodeURIComponent(studentId)}?date=${encodeURIComponent(date)}`, { status: body['status'] }, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
