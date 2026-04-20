import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPut } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { validateCsrfToken } from '@/infra/auth/csrf-token';
import { manualSubscriptionSchema } from '@/application/academy-detail/academy-actions.schemas';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ academyId: string }> },
) {
  if (!isOriginValid(request) || !(await validateCsrfToken(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { academyId } = await context.params;
  if (!OBJECT_ID_RE.test(academyId)) {
    return NextResponse.json({ error: 'Invalid academy id' }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = manualSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const result = await apiPut(
    `/api/v1/admin/academies/${encodeURIComponent(academyId)}/subscription`,
    parsed.data,
    { accessToken },
  );

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (result.error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error.message }, { status: 404 });
    }
    if (result.error.code === 'VALIDATION') {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
