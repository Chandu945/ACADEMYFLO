import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';

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
  const identifier = body.identifier?.trim();

  if (!identifier) {
    return NextResponse.json({ message: 'Email or phone is required' }, { status: 400 });
  }

  if (action === 'request') {
    const result = await apiPost('/api/v1/auth/password-reset/request', {
      email: identifier,
    });
    if (!result.ok) {
      return toErrorResponse(result.error);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    const otp = body.otp?.trim();
    const newPassword = body.newPassword;
    if (!otp || !newPassword) {
      return NextResponse.json({ message: 'Verification code and new password are required' }, { status: 400 });
    }
    if (!/^\d{4,8}$/.test(otp)) {
      return NextResponse.json({ message: 'Verification code must be 4-8 digits' }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 64) {
      return NextResponse.json({ message: 'Password must be between 8 and 64 characters' }, { status: 400 });
    }

    const result = await apiPost('/api/v1/auth/password-reset/confirm', {
      email: identifier,
      otp,
      newPassword,
    });
    if (!result.ok) {
      return toErrorResponse(result.error);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}
