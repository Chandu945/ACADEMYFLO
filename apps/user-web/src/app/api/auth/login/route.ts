import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

import { apiPost } from '@/infra/http/api-client';
import { setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: 'OWNER' | 'STAFF' | 'PARENT';
    status: string;
    profilePhotoUrl?: string | null;
  };
};

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { identifier, password } = body;
  if (!identifier || !password) {
    return NextResponse.json({ message: 'Email/phone and password are required' }, { status: 400 });
  }

  const deviceId = randomUUID();
  const result = await apiPost<LoginResponse>('/api/v1/auth/login', {
    identifier,
    password,
    deviceId,
  });

  if (!result.ok) {
    return toErrorResponse(result.error);
  }

  const { accessToken, refreshToken, user } = result.data;

  await setSessionCookie({
    refreshToken,
    deviceId,
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profilePhotoUrl: user.profilePhotoUrl ?? null,
  });

  return NextResponse.json({
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profilePhotoUrl: user.profilePhotoUrl ?? null,
    },
  });
}
