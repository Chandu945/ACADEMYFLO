import 'server-only';

import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

import { publicEnv } from '@/infra/env';

const COOKIE_NAME = 'af_admin_csrf';
const HEADER_NAME = 'x-csrf-token';
const TOKEN_BYTES = 32;

export function CSRF_COOKIE_NAME(): string {
  return COOKIE_NAME;
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export async function setCsrfCookie(): Promise<string> {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_APP_ENV } = publicEnv();
  const token = generateToken();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: NEXT_PUBLIC_APP_ENV !== 'development',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return token;
}

export async function clearCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Double-submit CSRF check. Returns true iff the X-CSRF-Token header
 * matches the af_admin_csrf cookie. Both must be present and equal
 * (constant-time compare to avoid timing oracles).
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const header = request.headers.get(HEADER_NAME) ?? request.headers.get('X-CSRF-Token');
  if (!header) return false;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const headerBuf = Buffer.from(header);
  const cookieBuf = Buffer.from(cookie);
  if (headerBuf.length !== cookieBuf.length) return false;
  try {
    return timingSafeEqual(headerBuf, cookieBuf);
  } catch {
    return false;
  }
}
