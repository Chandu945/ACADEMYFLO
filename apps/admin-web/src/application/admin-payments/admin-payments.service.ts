import { AppError } from '@/domain/common/errors';
import {
  adminPaymentsResponseSchema,
  type AdminPaymentsPayload,
  type PaymentStatus,
} from './admin-payments.schemas';

const BFF_PATH = '/api/admin/subscription-payments';

export type AdminPaymentsQuery = {
  page: number;
  pageSize: number;
  status?: PaymentStatus;
  academyId?: string;
  from?: string;
  to?: string;
  stuckThresholdMinutes?: number;
};

export type AdminPaymentsServiceResult =
  | { ok: true; data: AdminPaymentsPayload }
  | { ok: false; error: AppError };

export async function listAdminPayments(
  query: AdminPaymentsQuery,
  accessToken?: string,
): Promise<AdminPaymentsServiceResult> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.academyId) params.set('academyId', query.academyId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.stuckThresholdMinutes !== undefined) {
    params.set('stuckThresholdMinutes', String(query.stuckThresholdMinutes));
  }

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
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load payments';
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
  const parsed = adminPaymentsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }
  return { ok: true, data: parsed.data };
}
