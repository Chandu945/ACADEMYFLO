import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPatch } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ id: string }> };

const E164_RE = /^\+[1-9]\d{6,14}$/;
const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
const ALLOWED_GENDERS = new Set(['MALE', 'FEMALE']);

function validatePatchBody(raw: Record<string, unknown>): { ok: true } | { ok: false; message: string } {
  if ('fullName' in raw && (typeof raw['fullName'] !== 'string' || !raw['fullName'].trim())) {
    return { ok: false, message: 'fullName must be a non-empty string' };
  }
  if ('email' in raw && (typeof raw['email'] !== 'string' || !raw['email'].includes('@'))) {
    return { ok: false, message: 'email must be a valid email' };
  }
  if ('phoneNumber' in raw && (typeof raw['phoneNumber'] !== 'string' || !E164_RE.test(raw['phoneNumber']))) {
    return { ok: false, message: 'phoneNumber must be E.164 (e.g. +91XXXXXXXXXX)' };
  }
  if ('mobileNumber' in raw && raw['mobileNumber'] !== null && raw['mobileNumber'] !== '') {
    if (typeof raw['mobileNumber'] !== 'string' || !E164_RE.test(raw['mobileNumber'])) {
      return { ok: false, message: 'mobileNumber must be E.164' };
    }
  }
  if ('whatsappNumber' in raw && raw['whatsappNumber'] !== null && raw['whatsappNumber'] !== '') {
    if (typeof raw['whatsappNumber'] !== 'string' || !E164_RE.test(raw['whatsappNumber'])) {
      return { ok: false, message: 'whatsappNumber must be E.164' };
    }
  }
  if ('gender' in raw && raw['gender'] !== null && (typeof raw['gender'] !== 'string' || !ALLOWED_GENDERS.has(raw['gender']))) {
    return { ok: false, message: 'gender must be MALE or FEMALE' };
  }
  return { ok: true };
}

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid staff id' }, { status: 400 });
  }
  const result = await apiGet(`/api/v1/staff/${encodeURIComponent(id)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid staff id' }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  if (body['statusChange']) {
    const status = body['status'];
    if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ message: 'status must be ACTIVE or INACTIVE' }, { status: 400 });
    }
    const result = await apiPatch(`/api/v1/staff/${encodeURIComponent(id)}/status`, { status }, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  const { statusChange: _statusChange, status: _status, ...profileData } = body;
  void _statusChange;
  void _status;
  const v = validatePatchBody(profileData);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const result = await apiPatch(`/api/v1/staff/${encodeURIComponent(id)}`, profileData, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
