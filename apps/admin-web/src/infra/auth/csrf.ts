import 'server-only';

import type { NextRequest } from 'next/server';

/**
 * Best-effort CSRF check via Origin header.
 * Returns true if the request is safe (same-origin or no Origin header).
 * Returns false if Origin is present and does not match the request host.
 */
export function isOriginValid(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.nextUrl.host;
  } catch {
    return false;
  }
}
