import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiPost, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

const requestBodySchema = z.object({
  password: z.string().min(8).max(64),
  confirmationPhrase: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
  const parsed = requestBodySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return NextResponse.json({ message: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const result = await apiPost('/api/v1/account/deletion', parsed.data, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function DELETE(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const result = await apiDelete('/api/v1/account/deletion', { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data ?? {});
}
