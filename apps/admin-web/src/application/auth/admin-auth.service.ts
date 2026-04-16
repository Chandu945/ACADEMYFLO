import type { AuthSession } from '@/domain/admin/auth';
import { AppError } from '@/domain/common/errors';
import { BFF_LOGIN, BFF_LOGOUT, BFF_REFRESH } from '@/infra/auth/bff-routes';
import { csrfHeaders } from '@/infra/auth/csrf-client';

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(BFF_LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json.message ?? json.error ?? 'Login failed';
    if (res.status === 401) throw AppError.unauthorized(message);
    if (res.status === 400) throw AppError.validation(message);
    throw AppError.unknown(message);
  }

  return json as AuthSession;
}

export async function refreshAccessToken(): Promise<{ accessToken: string }> {
  const res = await fetch(BFF_REFRESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json.message ?? json.error ?? 'Session expired';
    throw AppError.unauthorized(message);
  }

  return json as { accessToken: string };
}

export async function logout(accessToken?: string): Promise<void> {
  const headers: Record<string, string> = csrfHeaders({
    'Content-Type': 'application/json',
  });
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  await fetch(BFF_LOGOUT, {
    method: 'POST',
    headers,
  });
}
