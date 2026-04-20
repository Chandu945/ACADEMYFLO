import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { apiPost } from '@/infra/http/api-client';
import { setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const signupBodySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_REGEX, 'Please enter a valid email address')
    .transform((v) => v.toLowerCase()),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(E164_REGEX, 'Phone must be in E.164 format (e.g. +919876543210)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be at most 64 characters'),
});

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
    profilePhotoUrl?: string | null;
  };
};

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  // Rate limiting is enforced by the upstream NestJS api (ThrottlerGuard on
  // /auth/owner/signup). The previous per-process Map was per-replica state
  // that attackers could bypass by landing on a different instance; it also
  // gave no signal to clients (no Retry-After).

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const parsed = signupBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return NextResponse.json(
      { message: 'Validation failed', fieldErrors },
      { status: 400 },
    );
  }

  const { fullName, email, phoneNumber, password } = parsed.data;

  const deviceId = randomUUID();
  const result = await apiPost<SignupResponse>('/api/v1/auth/owner/signup', {
    fullName,
    email,
    phoneNumber,
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
