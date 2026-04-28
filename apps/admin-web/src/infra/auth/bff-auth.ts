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

type RefreshOutcome =
  | { ok: true; accessToken: string }
  | { ok: false; permanent: boolean };

// Deduplication map: prevents concurrent refresh calls from racing.
// Shared by resolveAccessToken (server-side) and the /api/auth/refresh route
// (client-driven) so React strict-mode double-mount or 8-min timers can't
// fire two parallel refreshes that race the backend's atomic token rotation.
const _refreshPromises = new Map<string, Promise<RefreshOutcome>>();

/**
 * Refresh the access token using the session cookie, with concurrent-call
 * deduplication. Used by both server-side `resolveAccessToken` and the
 * client-facing `/api/auth/refresh` BFF route.
 */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  const session = await getSessionCookie();
  if (!session) return { ok: false, permanent: true };

  const existing = _refreshPromises.get(session.userId);
  if (existing) return existing;

  const promise = doRefresh(session);
  _refreshPromises.set(session.userId, promise);
  return promise;
}

/**
 * Extract access token from the request Authorization header,
 * or attempt a refresh using the session cookie.
 * Returns the access token or null if unauthenticated.
 */
export async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const outcome = await refreshAccessToken();
  return outcome.ok ? outcome.accessToken : null;
}

async function doRefresh(session: {
  refreshToken: string;
  deviceId: string;
  userId: string;
}): Promise<RefreshOutcome> {
  try {
    const result = await apiPost<RefreshResult>('/api/v1/admin/auth/refresh', {
      refreshToken: session.refreshToken,
      deviceId: session.deviceId,
      userId: session.userId,
    });

    if (!result.ok) {
      const code = result.error.code;
      const permanent = code === 'UNAUTHORIZED' || code === 'FORBIDDEN';
      if (permanent) {
        await clearSessionCookie();
      }
      return { ok: false, permanent };
    }

    await setSessionCookie(
      result.data.refreshToken ?? session.refreshToken,
      session.deviceId,
      session.userId,
    );
    return { ok: true, accessToken: result.data.accessToken };
  } finally {
    _refreshPromises.delete(session.userId);
  }
}

/**
 * Clear session cookie on backend 401. Call this when a backend
 * request fails with 401 to prevent infinite loops.
 */
export async function handleBackend401(): Promise<void> {
  await clearSessionCookie();
}
