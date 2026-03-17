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

// Deduplicate concurrent refresh calls to prevent token reuse revocation.
// Multiple BFF routes may call resolveAccessToken simultaneously when the
// client sends requests without an Authorization header (e.g. on page load).
let _refreshPromise: Promise<string | null> | null = null;

async function refreshFromCookie(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
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
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

export async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return refreshFromCookie();
}

export async function resolveAccessTokenFromCookie(): Promise<string | null> {
  return refreshFromCookie();
}

export async function handleBackend401(): Promise<void> {
  await clearSessionCookie();
}
