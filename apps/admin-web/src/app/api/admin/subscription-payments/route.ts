import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

type BackendItem = {
  id: string;
  academyId: string;
  academyName: string | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  orderId: string;
  cfOrderId: string | null;
  tierKey: string;
  amountInr: number;
  currency: string;
  activeStudentCountAtPurchase: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  failureReason: string | null;
  paidAt: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendResponse = {
  items: BackendItem[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const page = clampInt(sp.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(sp.get('pageSize'), 50, 1, 200);
  const status = sp.get('status') ?? undefined;
  const academyId = sp.get('academyId') ?? undefined;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const stuckRaw = sp.get('stuckThresholdMinutes');
  const stuckThresholdMinutes = stuckRaw ? Number.parseInt(stuckRaw, 10) : undefined;

  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }
  if (academyId && !ACADEMY_ID_RE.test(academyId)) {
    return NextResponse.json({ error: 'Invalid academyId' }, { status: 400 });
  }
  if (from && !DATE_RE.test(from)) {
    return NextResponse.json({ error: 'from must be YYYY-MM-DD' }, { status: 400 });
  }
  if (to && !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (
    stuckThresholdMinutes !== undefined &&
    (!Number.isFinite(stuckThresholdMinutes) ||
      stuckThresholdMinutes < 1 ||
      stuckThresholdMinutes > 60 * 24 * 30)
  ) {
    return NextResponse.json({ error: 'Invalid stuckThresholdMinutes' }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (status) params.set('status', status);
  if (academyId) params.set('academyId', academyId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (stuckThresholdMinutes !== undefined) params.set('stuckThresholdMinutes', String(stuckThresholdMinutes));

  const result = await apiGet<BackendResponse>(
    `/api/v1/admin/subscription-payments?${params.toString()}`,
    { accessToken },
  );

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
