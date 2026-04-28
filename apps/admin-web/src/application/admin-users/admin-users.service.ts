import { AppError } from '@/domain/common/errors';
import {
  adminUsersResponseSchema,
  type AdminUsersPayload,
} from './admin-users.schemas';

const BFF_PATH = '/api/admin/users';

export type AdminUsersQuery = {
  page: number;
  pageSize: number;
  q?: string;
  role?: string;
  academyId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type AdminUsersServiceResult =
  | { ok: true; data: AdminUsersPayload }
  | { ok: false; error: AppError };

export async function searchAdminUsers(
  query: AdminUsersQuery,
  accessToken?: string,
): Promise<AdminUsersServiceResult> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.q) params.set('q', query.q);
  if (query.role) params.set('role', query.role);
  if (query.academyId) params.set('academyId', query.academyId);
  if (query.status) params.set('status', query.status);

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
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to search users';
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
  const parsed = adminUsersResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }
  return { ok: true, data: parsed.data };
}
