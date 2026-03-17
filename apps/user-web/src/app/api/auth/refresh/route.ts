import { NextResponse } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { getSessionCookie, setSessionCookie, clearSessionCookie } from '@/infra/auth/session-cookie';

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export async function POST() {
  const session = await getSessionCookie();
  if (!session) {
    return NextResponse.json({ message: 'No session' }, { status: 401 });
  }

  const result = await apiPost<RefreshResponse>('/api/v1/auth/refresh', {
    refreshToken: session.refreshToken,
    deviceId: session.deviceId,
    userId: session.userId,
  });

  if (!result.ok) {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  await setSessionCookie({
    ...session,
    refreshToken: result.data.refreshToken ?? session.refreshToken,
  });

  return NextResponse.json({ accessToken: result.data.accessToken });
}
