import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ id: string; studentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id, studentId } = await params;
  const result = await apiPost(`/api/v1/batches/${encodeURIComponent(id)}/students/${encodeURIComponent(studentId)}`, {}, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id, studentId } = await params;
  const result = await apiDelete(`/api/v1/batches/${encodeURIComponent(id)}/students/${encodeURIComponent(studentId)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json({ ok: true });
}
