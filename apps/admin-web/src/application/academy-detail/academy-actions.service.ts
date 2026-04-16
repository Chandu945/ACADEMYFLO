import type { ManualSubscriptionInput, ResetPasswordResult } from '@/domain/admin/academy-detail';
import { AppError } from '@/domain/common/errors';
import { csrfHeaders } from '@/infra/auth/csrf-client';

const BFF_BASE = '/api/admin/academies';

export type ActionResult = { ok: true } | { ok: false; error: AppError };
export type ResetPasswordActionResult =
  | { ok: true; data: ResetPasswordResult }
  | { ok: false; error: AppError };

async function postAction(
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<ActionResult> {
  const headers: Record<string, string> = csrfHeaders({ 'Content-Type': 'application/json' });
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: AppError.network() };
  }

  if (!res.ok) {
    return parseErrorResponse(res);
  }

  return { ok: true };
}

async function parseErrorResponse(res: Response): Promise<{ ok: false; error: AppError }> {
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  const message = typeof json['error'] === 'string' ? json['error'] : 'Action failed';
  if (res.status === 401) return { ok: false, error: AppError.unauthorized(message) };
  if (res.status === 400) return { ok: false, error: AppError.validation(message) };
  if (res.status === 403) return { ok: false, error: AppError.forbidden(message) };
  if (res.status === 404) return { ok: false, error: AppError.notFound(message) };
  return { ok: false, error: AppError.unknown(message) };
}

export async function setManualSubscription(
  academyId: string,
  input: ManualSubscriptionInput,
  accessToken?: string,
): Promise<ActionResult> {
  return postAction(`${BFF_BASE}/${academyId}/subscription/manual`, input, accessToken);
}

export async function deactivateSubscription(
  academyId: string,
  accessToken?: string,
): Promise<ActionResult> {
  return postAction(`${BFF_BASE}/${academyId}/subscription/deactivate`, {}, accessToken);
}

export async function setLoginDisabled(
  academyId: string,
  disabled: boolean,
  accessToken?: string,
): Promise<ActionResult> {
  return postAction(`${BFF_BASE}/${academyId}/login/disable`, { disabled }, accessToken);
}

export async function forceLogout(academyId: string, accessToken?: string): Promise<ActionResult> {
  return postAction(`${BFF_BASE}/${academyId}/force-logout`, {}, accessToken);
}

export async function resetOwnerPassword(
  academyId: string,
  temporaryPassword?: string,
  accessToken?: string,
): Promise<ResetPasswordActionResult> {
  const headers: Record<string, string> = csrfHeaders({ 'Content-Type': 'application/json' });
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const body: Record<string, unknown> = {};
  if (temporaryPassword) body['temporaryPassword'] = temporaryPassword;

  let res: Response;
  try {
    res = await fetch(`${BFF_BASE}/${academyId}/reset-owner-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: AppError.network() };
  }

  if (!res.ok) {
    return parseErrorResponse(res);
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: AppError.unknown('Unexpected response format') };
  }

  const data = (json['data'] ?? json) as Record<string, unknown>;
  const tempPw = data['temporaryPassword'];
  if (typeof tempPw !== 'string') {
    return { ok: false, error: AppError.unknown('Unexpected response format') };
  }

  return { ok: true, data: { temporaryPassword: tempPw } };
}
