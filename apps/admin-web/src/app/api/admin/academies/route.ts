import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_ACADEMY_STATUSES, TIER_KEYS } from '@academyflo/contracts';
import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { sanitizeQueryValue } from '@/infra/http/query-sanitizer';

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

type BackendListResponse = {
  items: Array<{
    academyId: string;
    academyName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string | null;
    status: string;
    tierKey: string | null;
    activeStudentCount?: number | null;
    staffCount?: number | null;
    thisMonthRevenueTotal?: number | null;
    createdAt: string;
  }>;
  total: number;
};

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  // Validate and sanitize query params
  const page = clampInt(searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(searchParams.get('pageSize'), 20, 1, 100);
  const statusParam = searchParams.get('status') ?? undefined;
  const tierParam = searchParams.get('tier') ?? undefined;
  const search = sanitizeQueryValue((searchParams.get('search') ?? '').slice(0, 80)) || undefined;

  // Validate status enum
  if (statusParam && !(ADMIN_ACADEMY_STATUSES as readonly string[]).includes(statusParam)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  // Validate tier enum
  if (tierParam && !(TIER_KEYS as readonly string[]).includes(tierParam)) {
    return NextResponse.json({ error: 'Invalid tier filter' }, { status: 400 });
  }

  // Build backend query string
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (statusParam) params.set('status', statusParam);
  if (tierParam) params.set('tierKey', tierParam);
  if (search) params.set('search', search);

  const result = await apiGet<BackendListResponse>(`/api/v1/admin/academies?${params.toString()}`, {
    accessToken,
  });

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const { items, total } = result.data;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    success: true,
    data: {
      items,
      meta: { page, pageSize, totalItems: total, totalPages },
    },
  });
}
