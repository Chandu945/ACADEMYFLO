import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPatch, apiDelete } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ id: string }> };

const E164_RE = /^\+[1-9]\d{6,14}$/;
const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
const ALLOWED_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);

function validatePatchBody(raw: unknown): { ok: true; body: Record<string, unknown> } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Body must be an object' };
  }
  const body = raw as Record<string, unknown>;
  if ('fullName' in body && (typeof body['fullName'] !== 'string' || !body['fullName'].trim())) {
    return { ok: false, message: 'fullName must be a non-empty string' };
  }
  if ('mobileNumber' in body && body['mobileNumber'] !== null && body['mobileNumber'] !== '') {
    if (typeof body['mobileNumber'] !== 'string' || !E164_RE.test(body['mobileNumber'])) {
      return { ok: false, message: 'mobileNumber must be E.164 (e.g. +91XXXXXXXXXX)' };
    }
  }
  if ('whatsappNumber' in body && body['whatsappNumber'] !== null && body['whatsappNumber'] !== '') {
    if (typeof body['whatsappNumber'] !== 'string' || !E164_RE.test(body['whatsappNumber'])) {
      return { ok: false, message: 'whatsappNumber must be E.164' };
    }
  }
  if ('email' in body && body['email'] !== null && body['email'] !== '') {
    if (typeof body['email'] !== 'string' || !body['email'].includes('@')) {
      return { ok: false, message: 'email must be a valid email' };
    }
  }
  if ('monthlyFee' in body) {
    const fee = body['monthlyFee'];
    if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
      return { ok: false, message: 'monthlyFee must be a non-negative number' };
    }
  }
  if ('status' in body && (typeof body['status'] !== 'string' || !ALLOWED_STATUSES.has(body['status']))) {
    return { ok: false, message: 'status must be ACTIVE or INACTIVE' };
  }
  if ('gender' in body && (typeof body['gender'] !== 'string' || !ALLOWED_GENDERS.has(body['gender']))) {
    return { ok: false, message: 'gender must be MALE, FEMALE, or OTHER' };
  }
  if ('guardian' in body && body['guardian'] !== null) {
    const g = body['guardian'];
    if (!g || typeof g !== 'object') {
      return { ok: false, message: 'guardian must be an object' };
    }
    const guardian = g as Record<string, unknown>;
    if ('mobile' in guardian && (typeof guardian['mobile'] !== 'string' || !E164_RE.test(guardian['mobile']))) {
      return { ok: false, message: 'guardian.mobile must be E.164' };
    }
  }
  return { ok: true, body };
}

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }
  const result = await apiGet(`/api/v1/students/${encodeURIComponent(id)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

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
  const v = validatePatchBody(raw);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const result = await apiPatch(`/api/v1/students/${encodeURIComponent(id)}`, v.body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }
  const result = await apiDelete(`/api/v1/students/${encodeURIComponent(id)}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json({ ok: true });
}
