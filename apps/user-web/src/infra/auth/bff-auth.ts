import 'server-only';

import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import {
  getSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '@/infra/auth/session-cookie';

type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const session = await getSessionCookie();
  if (!session) return null;

  const result = await apiPost<RefreshResult>('/api/v1/auth/refresh', {
    refreshToken: session.refreshToken,
    deviceId: session.deviceId,
    userId: session.userId,
  });

  if (!result.ok) {
    await clearSessionCookie();
    return null;
  }

  await setSessionCookie({
    ...session,
    refreshToken: result.data.refreshToken ?? session.refreshToken,
  });
  return result.data.accessToken;
}

export async function resolveAccessTokenFromCookie(): Promise<string | null> {
  const session = await getSessionCookie();
  if (!session) return null;

  const result = await apiPost<RefreshResult>('/api/v1/auth/refresh', {
    refreshToken: session.refreshToken,
    deviceId: session.deviceId,
    userId: session.userId,
  });

  if (!result.ok) {
    await clearSessionCookie();
    return null;
  }

  await setSessionCookie({
    ...session,
    refreshToken: result.data.refreshToken ?? session.refreshToken,
  });
  return result.data.accessToken;
}

export async function handleBackend401(): Promise<void> {
  await clearSessionCookie();
}
