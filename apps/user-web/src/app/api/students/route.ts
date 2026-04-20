import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPost } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

const E164_RE = /^\+[1-9]\d{6,14}$/;
const ALLOWED_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);
const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
const ALLOWED_FEE_FILTERS = new Set(['ALL', 'PAID', 'UNPAID', 'OVERDUE']);
const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') || undefined;
  const feeFilter = searchParams.get('feeFilter') || undefined;
  const month = searchParams.get('month') || undefined;
  const batchId = searchParams.get('batchId') || undefined;

  if (status && !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ message: 'status must be ACTIVE or INACTIVE' }, { status: 400 });
  }
  if (feeFilter && !ALLOWED_FEE_FILTERS.has(feeFilter)) {
    return NextResponse.json({ message: 'feeFilter is invalid' }, { status: 400 });
  }
  if (month && !MONTH_RE.test(month)) {
    return NextResponse.json({ message: 'month must be YYYY-MM' }, { status: 400 });
  }
  if (batchId && !isValidObjectId(batchId)) {
    return NextResponse.json({ message: 'batchId must be a valid id' }, { status: 400 });
  }

  const params = buildSafeParams({
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '20',
    status,
    search: searchParams.get('search') || undefined,
    feeFilter,
    month,
    batchId,
  });

  const result = await apiGet(`/api/v1/students?${params}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

function validatePostBody(raw: Record<string, unknown>): { ok: true } | { ok: false; message: string } {
  if (!raw['fullName'] || typeof raw['fullName'] !== 'string' || !raw['fullName'].trim()) {
    return { ok: false, message: 'fullName is required' };
  }
  // dateOfBirth: ISO date YYYY-MM-DD or full ISO timestamp
  if (raw['dateOfBirth'] !== undefined) {
    if (typeof raw['dateOfBirth'] !== 'string' || Number.isNaN(Date.parse(raw['dateOfBirth']))) {
      return { ok: false, message: 'dateOfBirth must be a valid ISO date' };
    }
  }
  if (raw['gender'] !== undefined && (typeof raw['gender'] !== 'string' || !ALLOWED_GENDERS.has(raw['gender']))) {
    return { ok: false, message: 'gender must be MALE, FEMALE, or OTHER' };
  }
  if (raw['monthlyFee'] !== undefined) {
    const fee = raw['monthlyFee'];
    if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
      return { ok: false, message: 'monthlyFee must be a non-negative number' };
    }
  }
  if (raw['mobileNumber'] !== undefined && raw['mobileNumber'] !== null && raw['mobileNumber'] !== '') {
    if (typeof raw['mobileNumber'] !== 'string' || !E164_RE.test(raw['mobileNumber'])) {
      return { ok: false, message: 'mobileNumber must be E.164 (e.g. +91XXXXXXXXXX)' };
    }
  }
  if (raw['whatsappNumber'] !== undefined && raw['whatsappNumber'] !== null && raw['whatsappNumber'] !== '') {
    if (typeof raw['whatsappNumber'] !== 'string' || !E164_RE.test(raw['whatsappNumber'])) {
      return { ok: false, message: 'whatsappNumber must be E.164' };
    }
  }
  if (raw['email'] !== undefined && raw['email'] !== null && raw['email'] !== '') {
    if (typeof raw['email'] !== 'string' || !raw['email'].includes('@')) {
      return { ok: false, message: 'email must be a valid email' };
    }
  }
  if (raw['guardian'] !== undefined && raw['guardian'] !== null) {
    const g = raw['guardian'];
    if (!g || typeof g !== 'object') {
      return { ok: false, message: 'guardian must be an object' };
    }
    const guardian = g as Record<string, unknown>;
    if (guardian['mobile'] !== undefined && (typeof guardian['mobile'] !== 'string' || !E164_RE.test(guardian['mobile']))) {
      return { ok: false, message: 'guardian.mobile must be E.164' };
    }
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const v = validatePostBody(body);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const result = await apiPost('/api/v1/students', body, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data, { status: 201 });
}
