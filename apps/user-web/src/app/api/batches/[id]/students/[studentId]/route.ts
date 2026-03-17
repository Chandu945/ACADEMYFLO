import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';

type Params = { params: Promise<{ id: string; studentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id, studentId } = await params;
  const result = await apiPost(`/api/v1/batches/${id}/students/${studentId}`, {}, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id, studentId } = await params;
  const result = await apiDelete(`/api/v1/batches/${id}/students/${studentId}`, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
