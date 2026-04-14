import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { randomUUID } from 'crypto';
import { apiPost } from '@/infra/http/api-client';
import { getSessionCookie, setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';

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

// Rate limiting: 10 attempts per minute per IP
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
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

  return NextResponse.json({ accessToken, user, deviceId });
}
