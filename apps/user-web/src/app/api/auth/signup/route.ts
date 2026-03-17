import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

import { apiPost } from '@/infra/http/api-client';
import { setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';

type SignupResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: 'OWNER';
    status: string;
  };
};

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  let body: { fullName?: string; email?: string; phoneNumber?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { fullName, email, phoneNumber, password } = body;
  if (!fullName || !email || !phoneNumber || !password) {
    return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
  }

  const deviceId = randomUUID();
  const result = await apiPost<SignupResponse>('/api/v1/auth/owner/signup', {
    fullName,
    email,
    phoneNumber,
    password,
    deviceId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.error.message, fieldErrors: result.error.fieldErrors },
      { status: 400 },
    );
  }

  const { accessToken, refreshToken, user } = result.data;

  await setSessionCookie({
    refreshToken,
    deviceId,
    userId: user.id,
    role: user.role,
  });

  return NextResponse.json({ accessToken });
}
