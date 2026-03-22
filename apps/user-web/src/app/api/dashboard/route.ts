import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { toErrorResponse } from '@/infra/http/error-mapper';

/* ── Simple in-memory rate limiter ── */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP
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

if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, CLEANUP_INTERVAL).unref?.();
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'kpis';

  if (type === 'chart') {
    const year = searchParams.get('year') || String(new Date().getFullYear());
    const params = buildSafeParams({ year });
    const result = await apiGet(`/api/v1/dashboard/monthly-chart?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'birthdays') {
    const params = buildSafeParams({ scope: searchParams.get('scope') || 'today' });
    const result = await apiGet(`/api/v1/dashboard/birthdays?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const preset = searchParams.get('preset');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const params = buildSafeParams({ preset: preset || undefined, from: from || undefined, to: to || undefined });
  const path = params.toString() ? `/api/v1/dashboard/owner?${params}` : '/api/v1/dashboard/owner?preset=THIS_MONTH';
  const result = await apiGet(path, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
