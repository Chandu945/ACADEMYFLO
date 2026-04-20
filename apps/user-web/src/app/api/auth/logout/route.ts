import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { getSessionCookie, clearSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { clearCsrfCookie } from '@/infra/auth/csrf-token';

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  const accessToken = await resolveAccessToken(request);
  const session = await getSessionCookie();

  if (session) {
    try {
      await apiPost('/api/v1/auth/logout', { deviceId: session.deviceId }, accessToken ? { accessToken } : undefined);
    } catch {
      // Best-effort: still clear cookie even if backend fails
    }
  }

  await clearSessionCookie();
  await clearCsrfCookie();
  return NextResponse.json({ ok: true });
}
