import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { validateCsrfToken } from '@/infra/auth/csrf-token';
import { serverEnv } from '@/infra/env';

/**
 * Accept a parent's manual payment request (multipart with proof image).
 * Forwards the multipart body verbatim to apps/api's
 * `POST /api/v1/parent/payment-requests`. Mirrors the mobile call at
 * apps/mobile/src/infra/parent/parent-api.ts:203.
 */
export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }
  if (!(await validateCsrfToken(request))) {
    return NextResponse.json({ message: 'CSRF token invalid or missing' }, { status: 403 });
  }
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return NextResponse.json(
      { message: 'Content-Type must be multipart/form-data' },
      { status: 400 },
    );
  }

  // Pass-through: read the form, re-emit it. We cannot stream the original
  // request body directly because Next has already buffered it into the
  // FormData object accessible via request.formData().
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid multipart body' }, { status: 400 });
  }

  // Re-emit a fresh FormData. Browsers / Node 20 handle this with the
  // built-in `fetch` setting Content-Type + boundary automatically.
  const upstream = new FormData();
  for (const [key, value] of form.entries()) {
    upstream.append(key, value);
  }

  const { API_BASE_URL } = serverEnv();
  const url = `${API_BASE_URL}/api/v1/parent/payment-requests`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: upstream,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json({ message: 'Network error' }, { status: 502 });
  }

  const text = await res.text();
  // Forward upstream response body verbatim (it's JSON either way).
  return new NextResponse(text || '{}', {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
