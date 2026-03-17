import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { isOriginValid } from '@/infra/auth/csrf';

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) {
    return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  }

  let body: { action?: string; identifier?: string; otp?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { action } = body;

  if (action === 'request') {
    const result = await apiPost('/api/v1/auth/password-reset/request', {
      identifier: body.identifier,
    });
    if (!result.ok) {
      return NextResponse.json({ message: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    const result = await apiPost('/api/v1/auth/password-reset/confirm', {
      identifier: body.identifier,
      otp: body.otp,
      newPassword: body.newPassword,
    });
    if (!result.ok) {
      return NextResponse.json({ message: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}
