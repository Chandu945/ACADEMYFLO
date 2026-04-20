import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id, photoId } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ message: 'Invalid event id' }, { status: 400 });
  if (!isValidObjectId(photoId)) return NextResponse.json({ message: 'Invalid photo id' }, { status: 400 });
  const result = await apiDelete(
    `/api/v1/events/${encodeURIComponent(id)}/gallery/${encodeURIComponent(photoId)}`,
    { accessToken },
  );
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json({ ok: true });
}
