import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ requestId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { requestId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const { action, ...data } = body;

  if (!['approve', 'reject', 'cancel'].includes(String(action))) {
    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  }

  let path = `/api/v1/fees/payment-requests/${encodeURIComponent(requestId)}`;
  if (action === 'approve') path += '/approve';
  else if (action === 'reject') path += '/reject';
  else if (action === 'cancel') path += '/cancel';

  const result = await apiPut(path, data, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
