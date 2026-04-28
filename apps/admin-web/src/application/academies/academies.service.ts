import type { AcademiesListResult, AcademiesQuery } from '@/domain/admin/academies';
import { AppError } from '@/domain/common/errors';
import { serializeQuery } from './query';
import { academiesListResponseSchema } from './academies.schemas';

const BFF_ACADEMIES = '/api/admin/academies';

export type AcademiesResult =
  | { ok: true; data: AcademiesListResult }
  | { ok: false; error: AppError };

export async function listAcademies(
  query: AcademiesQuery,
  accessToken?: string,
): Promise<AcademiesResult> {
  const params = serializeQuery(query);
  const url = `${BFF_ACADEMIES}?${params.toString()}`;

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
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load academies';
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
  const parsed = academiesListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }

  return {
    ok: true,
    data: {
      items: parsed.data.items.map((row) => ({
        academyId: row.academyId,
        academyName: row.academyName ?? '(unnamed)',
        ownerName: row.ownerName ?? '(no owner)',
        ownerEmail: row.ownerEmail ?? '',
        ownerPhone: row.ownerPhone ?? null,
        status: row.status as AcademiesListResult['items'][number]['status'],
        tierKey: row.tierKey as AcademiesListResult['items'][number]['tierKey'],
        activeStudentCount: row.activeStudentCount ?? null,
        staffCount: row.staffCount ?? null,
        thisMonthRevenueTotal: row.thisMonthRevenueTotal ?? null,
        createdAt: row.createdAt,
      })),
      meta: parsed.data.meta,
    },
  };
}
