import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet, apiPut } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const result = await apiGet('/api/v1/parent/profile', { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function PUT(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (body.changePassword) {
    const result = await apiPut('/api/v1/parent/change-password', {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    }, { accessToken });
    if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json(result.data);
  }

  const result = await apiPut('/api/v1/parent/profile', body, { accessToken });
  if (!result.ok) return NextResponse.json({ message: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
