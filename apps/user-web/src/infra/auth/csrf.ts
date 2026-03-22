import 'server-only';

import type { NextRequest } from 'next/server';

export function isOriginValid(request: NextRequest): boolean {
  // Try Origin header first (always present on POST per spec)
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === request.nextUrl.host;
    } catch {
      return false;
    }
  }

  // Fallback to Referer header (some tools/older browsers may omit Origin)
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
