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

// Deduplication map: prevents concurrent refresh calls from racing
const _refreshPromises = new Map<string, Promise<string | null>>();

/**
 * Extract access token from the request Authorization header,
 * or attempt a refresh using the session cookie.
 * Returns the access token or null if unauthenticated.
 */
export async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to refreshing via session cookie
  const session = await getSessionCookie();
  if (!session) return null;

  // Deduplicate concurrent refreshes by userId
  const existing = _refreshPromises.get(session.userId);
  if (existing) return existing;

  const promise = refreshFromCookie(session);
  _refreshPromises.set(session.userId, promise);
  return promise;
}

async function refreshFromCookie(session: {
  refreshToken: string;
  deviceId: string;
  userId: string;
}): Promise<string | null> {
  try {
    const result = await apiPost<RefreshResult>('/api/v1/admin/auth/refresh', {
      refreshToken: session.refreshToken,
      deviceId: session.deviceId,
      userId: session.userId,
    });

    if (!result.ok) {
      // Only clear cookie for permanent auth failures, not transient errors
      const code = result.error.code;
      if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
        await clearSessionCookie();
      }
      return null;
    }

    // Rotate cookie
    await setSessionCookie(
      result.data.refreshToken ?? session.refreshToken,
      session.deviceId,
      session.userId,
    );
    return result.data.accessToken;
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
