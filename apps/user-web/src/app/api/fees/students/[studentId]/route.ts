import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ studentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { studentId } = await params;
  const { searchParams } = request.nextUrl;
  const qp = buildSafeParams({
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  });
  const result = await apiGet(`/api/v1/fees/students/${encodeURIComponent(studentId)}?${qp}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { studentId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const { month, ...payData } = body;
  const result = await apiPut(`/api/v1/fees/students/${encodeURIComponent(studentId)}/${encodeURIComponent(String(month))}/pay`, payData, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
