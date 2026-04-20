import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { toErrorResponse } from '@/infra/http/error-mapper';

type Params = { params: Promise<{ orderId: string }> };

// Cashfree order IDs we mint follow `pc_sub_YYYYMMDD_xxxxxxxx` or similar —
// alphanumeric, underscores, dashes. Reject anything else before hitting the
// upstream API so malformed params don't fan out to a 5xx / expensive lookup.
const ORDER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { orderId } = await params;
  if (!ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ message: 'Invalid order id' }, { status: 400 });
  }

  const result = await apiGet(`/api/v1/subscription-payments/${encodeURIComponent(orderId)}/status`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
