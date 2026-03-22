import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPatch } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  if (body['statusChange']) {
    const result = await apiPatch(`/api/v1/staff/${encodeURIComponent(id)}/status`, { status: body['status'] }, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const { statusChange, status, ...profileData } = body;
  const result = await apiPatch(`/api/v1/staff/${encodeURIComponent(id)}`, profileData, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
