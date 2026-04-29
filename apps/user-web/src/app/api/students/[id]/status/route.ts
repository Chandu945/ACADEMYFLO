import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPatch } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { validateCsrfToken } from '@/infra/auth/csrf-token';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

/**
 * Dedicated status-change endpoint matching apps/mobile's
 * `PATCH /api/v1/students/{id}/status` with body `{status, reason}`.
 * The main `/api/students/[id]` PATCH does not accept status transitions
 * to LEFT (only ACTIVE/INACTIVE) and uses a different request key
 * (`statusChangeReason` vs the backend's `reason`). This route forwards
 * cleanly so status changes hit the same backend handler the mobile app
 * has been using for months.
 */

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'LEFT']);

export async function PATCH(request: NextRequest, { params }: Params) {
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

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ message: 'Body must be an object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const status = body['status'];
  if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ message: 'status must be ACTIVE, INACTIVE, or LEFT' }, { status: 400 });
  }

  const reason = body['reason'];
  if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 500)) {
    return NextResponse.json({ message: 'reason must be a string up to 500 chars' }, { status: 400 });
  }

  const result = await apiPatch(
    `/api/v1/students/${encodeURIComponent(id)}/status`,
    { status, reason: reason || undefined },
    { accessToken },
  );
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
