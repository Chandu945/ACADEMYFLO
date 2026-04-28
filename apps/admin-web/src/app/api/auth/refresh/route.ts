import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { refreshAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { setCsrfCookie, clearCsrfCookie } from '@/infra/auth/csrf-token';

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const outcome = await refreshAccessToken();

  if (!outcome.ok) {
    // Permanent failure (UNAUTHORIZED/FORBIDDEN): refreshAccessToken already
    // cleared the session cookie. Transient failure (parallel refresh that
    // already rotated the cookie, network blip): leave the session alone —
    // a sibling call may have just renewed it, and clearing here would
    // spuriously log the user out.
    if (outcome.permanent) {
      await clearCsrfCookie();
    }
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // refreshAccessToken already rotated the session cookie. Rotate CSRF too.
  await setCsrfCookie();

  return NextResponse.json({ accessToken: outcome.accessToken });
}
