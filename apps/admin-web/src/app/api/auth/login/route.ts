import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { randomUUID } from 'crypto';
import { apiPost } from '@/infra/http/api-client';
import { getSessionCookie, setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { setCsrfCookie } from '@/infra/auth/csrf-token';

type BackendLoginResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'SUPER_ADMIN';
  };
};

// No BFF-layer rate limit: the in-memory map was per-process (useless across
// replicas / after restarts) and `x-forwarded-for` is attacker-controllable
// when the BFF is reachable without going through the trusted ingress.
// Rate limiting is enforced at the backend: global ThrottlerGuard, per-route
// Throttle on /auth/login, and Redis-backed LoginAttemptTracker for account
// lockout. Edge-level protection, if needed, belongs at the reverse proxy.

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  // Reuse existing deviceId from session cookie if available, otherwise generate a new one
  const existingSession = await getSessionCookie();
  const clientDeviceId = existingSession?.deviceId ?? randomUUID();

  const result = await apiPost<BackendLoginResponse>('/api/v1/admin/auth/login', {
    email: body.email,
    password: body.password,
    deviceId: clientDeviceId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.code === 'UNAUTHORIZED' ? 401 : 400 },
    );
  }

  const { accessToken, refreshToken, deviceId, user } = result.data;

  await setSessionCookie(refreshToken, deviceId, user.id);
  await setCsrfCookie();

  return NextResponse.json({ accessToken, user, deviceId });
}
