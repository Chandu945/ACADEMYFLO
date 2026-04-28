import { AppError } from '@/domain/common/errors';
import {
  adminAuditLogsResponseSchema,
  type AdminAuditLogsPayload,
} from './admin-audit.schemas';

const BFF_PATH = '/api/admin/audit-logs';

export type AdminAuditQuery = {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
  academyId?: string;
  actorUserId?: string;
};

export type AdminAuditServiceResult =
  | { ok: true; data: AdminAuditLogsPayload }
  | { ok: false; error: AppError };

export async function listAdminAuditLogs(
  query: AdminAuditQuery,
  accessToken?: string,
): Promise<AdminAuditServiceResult> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.entityType) params.set('entityType', query.entityType);
  if (query.academyId) params.set('academyId', query.academyId);
  if (query.actorUserId) params.set('actorUserId', query.actorUserId);

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BFF_PATH}?${params.toString()}`, { headers });
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
    const message =
      typeof json['error'] === 'string' ? json['error'] : 'Failed to load audit logs';
    if (res.status === 401) return { ok: false, error: AppError.unauthorized(message) };
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
  const parsed = adminAuditLogsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }

  return { ok: true, data: parsed.data };
}
