import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

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
    if (!isValidObjectId(studentId)) {
      return NextResponse.json({ message: 'Invalid studentId' }, { status: 400 });
    }
    if (!month || !MONTH_RE.test(month)) {
      return NextResponse.json({ message: 'month must be YYYY-MM' }, { status: 400 });
    }
    const result = await apiGet(`/api/v1/attendance/reports/monthly/student/${encodeURIComponent(studentId)}?month=${encodeURIComponent(month)}`, { accessToken });
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
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    return NextResponse.json({ message: 'date is required and must be in YYYY-MM-DD format' }, { status: 400 });
  }

  if (body['bulk']) {
    const rawUpdates = body['updates'];
    if (!Array.isArray(rawUpdates)) {
      return NextResponse.json({ message: 'updates must be an array' }, { status: 400 });
    }
    // Hard cap — protects the API and avoids accidentally sending a huge payload.
    if (rawUpdates.length > 1000) {
      return NextResponse.json({ message: 'updates exceeds 1000 items' }, { status: 400 });
    }
    const absentStudentIds: string[] = [];
    for (const u of rawUpdates) {
      if (!u || typeof u !== 'object') {
        return NextResponse.json({ message: 'each update must be an object' }, { status: 400 });
      }
      const record = u as Record<string, unknown>;
      const sid = record['studentId'];
      const status = record['status'];
      if (!isValidObjectId(sid)) {
        return NextResponse.json({ message: 'invalid studentId in updates' }, { status: 400 });
      }
      if (status !== 'PRESENT' && status !== 'ABSENT') {
        return NextResponse.json({ message: 'status must be PRESENT or ABSENT' }, { status: 400 });
      }
      if (status === 'ABSENT') absentStudentIds.push(sid);
    }
    const result = await apiPut(`/api/v1/attendance/students/bulk?date=${encodeURIComponent(date)}`, { absentStudentIds }, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const studentId = body['studentId'];
  if (!isValidObjectId(studentId)) {
    return NextResponse.json({ message: 'studentId is required and must be a valid id' }, { status: 400 });
  }
  const status = body['status'];
  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return NextResponse.json({ message: 'status must be PRESENT or ABSENT' }, { status: 400 });
  }

  const result = await apiPut(`/api/v1/attendance/students/${encodeURIComponent(studentId)}?date=${encodeURIComponent(date)}`, { status }, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
