import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPost, apiPut, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;

  if (searchParams.get('type') === 'summary') {
    const params = buildSafeParams({ month: searchParams.get('month') || undefined });
    const result = await apiGet(`/api/v1/expenses/summary?${params}`, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  const params = buildSafeParams({
    month: searchParams.get('month') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '20',
  });
  const result = await apiGet(`/api/v1/expenses?${params}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const result = await apiPost('/api/v1/expenses', body, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...data } = body;
  const result = await apiPut(`/api/v1/expenses/${encodeURIComponent(id)}`, data, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function DELETE(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const result = await apiDelete(`/api/v1/expenses/${encodeURIComponent(id || '')}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
