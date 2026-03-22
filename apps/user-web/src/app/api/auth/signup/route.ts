import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { apiPost } from '@/infra/http/api-client';
import { setSessionCookie } from '@/infra/auth/session-cookie';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

const signupBodySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be at most 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .transform((v) => v.toLowerCase()),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(E164_REGEX, 'Phone must be in E.164 format (e.g. +919876543210)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be at most 64 characters')
    .regex(STRONG_PASSWORD_REGEX, 'Must include uppercase, lowercase, number, and special character'),
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

/* ── Simple in-memory rate limiter ── */
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 attempts per window per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up stale entries (every 5 minutes)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, CLEANUP_INTERVAL).unref?.();
}

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { message: 'Too many signup attempts. Please wait a minute and try again.' },
      { status: 429 },
    );
  }

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
