import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { validateCsrfToken } from '@/infra/auth/csrf-token';

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

  const result = await apiPost(
    `/api/v1/admin/academies/${encodeURIComponent(academyId)}/force-logout`,
    {},
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
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
