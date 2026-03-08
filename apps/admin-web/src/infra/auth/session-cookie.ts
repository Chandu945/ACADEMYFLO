import 'server-only';

import { cookies } from 'next/headers';

import { publicEnv } from '@/infra/env';

const COOKIE_NAME = 'pc_admin_session';

type SessionPayload = {
  refreshToken: string;
  deviceId: string;
};

export async function setSessionCookie(refreshToken: string, deviceId: string): Promise<void> {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_APP_ENV } = publicEnv();

  const payload: SessionPayload = { refreshToken, deviceId };

  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: NEXT_PUBLIC_APP_ENV !== 'development',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function getSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    return JSON.parse(cookie.value) as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
