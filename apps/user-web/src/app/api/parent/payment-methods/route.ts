import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { toErrorResponse } from '@/infra/http/error-mapper';

/**
 * Returns the academy's configured payment methods (UPI ID + QR code,
 * bank account details, manual-payments enabled flag) so a parent can
 * submit a manual payment without leaving the app. Mirrors the mobile
 * call at apps/mobile/src/infra/parent/parent-api.ts:189.
 */
export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const result = await apiGet('/api/v1/parent/payment-methods', { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
