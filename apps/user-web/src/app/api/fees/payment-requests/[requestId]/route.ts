import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';

type Params = { params: Promise<{ requestId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { requestId } = await params;
  const body = await request.json();
  const { action, ...data } = body;

  let path = `/api/v1/fees/payment-requests/${requestId}`;
  if (action === 'approve') path += '/approve';
  else if (action === 'reject') path += '/reject';
  else if (action === 'cancel') path += '/cancel';

  const result = await apiPut(path, data, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
