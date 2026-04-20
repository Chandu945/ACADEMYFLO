import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ studentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { studentId } = await params;
  if (!isValidObjectId(studentId)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const month = searchParams.get('month') || undefined;
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ message: 'month must be YYYY-MM' }, { status: 400 });
  }

  const qp = buildSafeParams({ month });
  const result = await apiGet(`/api/v1/parent/children/${encodeURIComponent(studentId)}/attendance?${qp}`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}
