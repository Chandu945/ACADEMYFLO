import { AppError } from '@/domain/common/errors';
import {
  adminRevenueSchema,
  type AdminRevenuePayload,
} from './admin-revenue.schemas';

const BFF_PATH = '/api/admin/revenue';

export type AdminRevenueServiceResult =
  | { ok: true; data: AdminRevenuePayload }
  | { ok: false; error: AppError };

export async function getAdminRevenue(
  accessToken?: string,
): Promise<AdminRevenueServiceResult> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(BFF_PATH, { headers });
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
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load revenue';
    if (res.status === 401) return { ok: false, error: AppError.unauthorized(message) };
    return { ok: false, error: AppError.unknown(message) };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: AppError.unknown('Unexpected response format') };
  }

  const raw = json['data'] ?? json;
  const parsed = adminRevenueSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }
  return { ok: true, data: parsed.data };
}
