import type { AuditLogsResult, AuditLogsQuery } from '@/domain/admin/audit-logs';
import { AppError } from '@/domain/common/errors';
import { serializeQuery } from './query';
import { auditLogsResponseSchema } from './audit-logs.schemas';

const BFF_BASE = '/api/admin/academies';

export type AuditLogsServiceResult =
  | { ok: true; data: AuditLogsResult }
  | { ok: false; error: AppError };

export async function listAuditLogs(
  academyId: string,
  query: AuditLogsQuery,
  accessToken?: string,
): Promise<AuditLogsServiceResult> {
  const params = serializeQuery(query);
  const url = `${BFF_BASE}/${academyId}/audit-logs?${params.toString()}`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    return { ok: false, error: AppError.network() };
  }

  if (!res.ok) {
    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      // ignore
    }
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load audit logs';
    if (res.status === 401) return { ok: false, error: AppError.unauthorized(message) };
    if (res.status === 404) return { ok: false, error: AppError.notFound(message) };
    if (res.status === 400) return { ok: false, error: AppError.validation(message) };
    return { ok: false, error: AppError.unknown(message) };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: AppError.unknown('Unexpected response format') };
  }

  const raw = json['data'] ?? json;
  const parsed = auditLogsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }

  return {
    ok: true,
    data: parsed.data as AuditLogsResult,
  };
}
