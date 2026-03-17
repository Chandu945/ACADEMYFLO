import { NextResponse } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { getSessionCookie, clearSessionCookie } from '@/infra/auth/session-cookie';

export async function POST() {
  const session = await getSessionCookie();

  if (session) {
    await apiPost('/api/v1/auth/logout', { deviceId: session.deviceId });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
