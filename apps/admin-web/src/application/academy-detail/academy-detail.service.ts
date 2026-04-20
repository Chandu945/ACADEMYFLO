import type { AdminAcademyDetail } from '@/domain/admin/academy-detail';
import { AppError } from '@/domain/common/errors';
import { academyDetailResponseSchema } from './academy-detail.schemas';

const BFF_BASE = '/api/admin/academies';

export type DetailResult = { ok: true; data: AdminAcademyDetail } | { ok: false; error: AppError };

export async function getDetail(academyId: string, accessToken?: string): Promise<DetailResult> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BFF_BASE}/${academyId}`, { headers });
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
    const message = typeof json['error'] === 'string' ? json['error'] : 'Failed to load academy';
    if (res.status === 401) return { ok: false, error: AppError.unauthorized(message) };
    if (res.status === 404) return { ok: false, error: AppError.notFound(message) };
    return { ok: false, error: AppError.unknown(message) };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: AppError.unknown('Unexpected response format') };
  }

  const raw = json['data'] ?? json;
  const parsed = academyDetailResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: AppError.validation('Unexpected response format') };
  }

  const d = parsed.data;

  const detail: AdminAcademyDetail = {
    academyId: d.academyId,
    academyName: d.academyName,
    loginDisabled: d.loginDisabled,
    owner: {
      fullName: d.ownerName,
      email: d.ownerEmail,
      phoneNumber: d.ownerPhone,
      profilePhotoUrl: d.ownerProfilePhotoUrl,
    },
    subscription: d.subscription
      ? {
          status: d.subscription.status,
          tierKey: d.subscription.tierKey,
          pendingTierKey: d.subscription.pendingTierKey,
          pendingTierEffectiveAt: d.subscription.pendingTierEffectiveAt,
          trialEndAt: d.subscription.trialEndAt,
          paidStartAt: d.subscription.paidStartAt,
          paidEndAt: d.subscription.paidEndAt,
          manualNotes: d.subscription.manualNotes,
          paymentReference: d.subscription.paymentReference,
        }
      : {
          status: 'BLOCKED',
          tierKey: null,
          pendingTierKey: null,
          pendingTierEffectiveAt: null,
          trialEndAt: null,
          paidStartAt: null,
          paidEndAt: null,
          manualNotes: null,
          paymentReference: null,
        },
    metrics: {
      activeStudentCount: d.studentCount,
      staffCount: d.staffCount,
      thisMonthRevenueTotal: d.revenueThisMonth,
    },
  };

  return { ok: true, data: detail };
}
