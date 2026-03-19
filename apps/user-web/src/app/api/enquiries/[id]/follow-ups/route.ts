import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
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
  const result = await apiPost(`/api/v1/enquiries/${encodeURIComponent(id)}/follow-ups`, body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data, { status: 201 });
}
