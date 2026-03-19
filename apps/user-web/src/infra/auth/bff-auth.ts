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
// Keyed by userId so one user's in-flight refresh is never served to another.
const _refreshPromises = new Map<string, Promise<string | null>>();

/** Error codes that indicate a permanent auth failure — session must be cleared. */
const PERMANENT_AUTH_ERRORS = new Set(['UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION', 'NOT_FOUND']);

async function refreshFromCookie(): Promise<string | null> {
  const session = await getSessionCookie();
  if (!session) return null;

  const userId = session.userId;

  const existing = _refreshPromises.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    const result = await apiPost<RefreshResult>('/api/v1/auth/refresh', {
      refreshToken: session.refreshToken,
      deviceId: session.deviceId,
      userId: session.userId,
    });

    if (!result.ok) {
      // Only clear the session on permanent auth failures.
      // Transient errors (NETWORK, UNKNOWN, RATE_LIMITED) preserve the session
      // so the next request can retry without forcing a full re-login.
      if (PERMANENT_AUTH_ERRORS.has(result.error.code)) {
        await clearSessionCookie();
      }
      return null;
    }

    await setSessionCookie({
      ...session,
      refreshToken: result.data.refreshToken ?? session.refreshToken,
    });
    return result.data.accessToken;
  })();

  _refreshPromises.set(userId, promise);

  try {
    return await promise;
  } finally {
    _refreshPromises.delete(userId);
  }
}

export async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Reject empty or whitespace-only bearer tokens
    if (!token.trim()) return refreshFromCookie();
    return token;
  }

  return refreshFromCookie();
}

/**
 * Clear the session cookie when the backend returns 401 for an already-resolved
 * access token.  Call this in BFF routes that detect an UNAUTHORIZED error after
 * the token was obtained from the cookie (not from a client-supplied header).
 */
export async function handleBackend401(): Promise<void> {
  await clearSessionCookie();
}
