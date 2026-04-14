import 'server-only';

import type { NextRequest } from 'next/server';

/**
 * CSRF check via Origin or Referer header.
 * Returns true only if a same-origin header is present and matches.
 * Returns false if neither header is present (strict — matches user-web).
 */
export function isOriginValid(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === request.nextUrl.host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === request.nextUrl.host;
    } catch {
      return false;
    }
  }

  return false;
}
