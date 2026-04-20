import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { getSessionCookie, setSessionCookie, clearSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { setCsrfCookie } from '@/infra/auth/csrf-token';

type RefreshUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePhotoUrl: string | null;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user?: RefreshUser;
};

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

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

  const backendUser = result.data.user;

  await setSessionCookie({
    ...session,
    refreshToken: result.data.refreshToken ?? session.refreshToken,
    fullName: backendUser?.fullName ?? session.fullName,
    email: backendUser?.email ?? session.email,
    phoneNumber: backendUser?.phoneNumber ?? session.phoneNumber,
    profilePhotoUrl: backendUser?.profilePhotoUrl ?? session.profilePhotoUrl,
  });
  // Rotate CSRF token alongside session refresh — keeps it in sync and prevents
  // the token from going stale if the tab lives longer than the cookie TTL.
  await setCsrfCookie();

  return NextResponse.json({
    accessToken: result.data.accessToken,
    user: {
      id: session.userId,
      fullName: backendUser?.fullName ?? session.fullName ?? '',
      email: backendUser?.email ?? session.email ?? '',
      phoneNumber: backendUser?.phoneNumber ?? session.phoneNumber ?? '',
      role: session.role,
      profilePhotoUrl: backendUser?.profilePhotoUrl ?? session.profilePhotoUrl ?? null,
    },
  });
}
