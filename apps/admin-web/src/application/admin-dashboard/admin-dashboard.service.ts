import type { AdminDashboardCounts } from '@/domain/admin/dashboard';
import { AppError } from '@/domain/common/errors';
import { dashboardCountsSchema } from './admin-dashboard.schemas';

const BFF_DASHBOARD = '/api/admin/dashboard';

export type DashboardResult =
  | { ok: true; data: AdminDashboardCounts }
  | { ok: false; error: AppError };

function mapToDomain(
  payload: ReturnType<(typeof dashboardCountsSchema)['parse']>,
): AdminDashboardCounts {
  return {
    totalAcademies: payload.totalAcademies,
    activeTrials: payload.activeTrials,
    activePaid: payload.activePaid,
    expiredGrace: payload.expiredGrace,
    disabled: payload.disabled,
    blocked: payload.blocked,
  };
}

export async function getDashboard(accessToken?: string): Promise<DashboardResult> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(BFF_DASHBOARD, { headers });
  } catch {
    return { ok: false, error: AppError.network() };
  }

  if (!res.ok) {
    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      // ignore parse errors
    }
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load dashboard';
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
  const parsed = dashboardCountsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }

  return { ok: true, data: mapToDomain(parsed.data) };
}
