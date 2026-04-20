import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ studentId: string }> };

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { studentId } = await params;
  if (!isValidObjectId(studentId)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  if (from && !MONTH_RE.test(from)) {
    return NextResponse.json({ message: 'from must be YYYY-MM' }, { status: 400 });
  }
  if (to && !MONTH_RE.test(to)) {
    return NextResponse.json({ message: 'to must be YYYY-MM' }, { status: 400 });
  }
  const qp = buildSafeParams({ from, to });
  const result = await apiGet(`/api/v1/parent/children/${encodeURIComponent(studentId)}/fees?${qp}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
