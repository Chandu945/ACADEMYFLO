import 'server-only';

import type { NextRequest } from 'next/server';

export function isOriginValid(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.nextUrl.host;
  } catch {
    return false;
  }
}
