import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPatch, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const studentParams = searchParams.get('students');
  if (studentParams === 'true') {
    const qp = buildSafeParams({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '50',
      search: searchParams.get('search') || undefined,
    });
    const result = await apiGet(`/api/v1/batches/${encodeURIComponent(id)}/students?${qp}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const result = await apiGet(`/api/v1/batches/${encodeURIComponent(id)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await apiPatch(`/api/v1/batches/${encodeURIComponent(id)}`, body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await apiDelete(`/api/v1/batches/${encodeURIComponent(id)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json({ ok: true });
}
