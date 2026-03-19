import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPost, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const result = await apiGet('/api/v1/expense-categories', { accessToken });
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
  const result = await apiPost('/api/v1/expense-categories', body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const result = await apiDelete(`/api/v1/expense-categories/${encodeURIComponent(id || '')}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json({ ok: true });
}
