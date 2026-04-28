import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_ACADEMY_STATUSES, TIER_KEYS } from '@academyflo/contracts';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { sanitizeQueryValue } from '@/infra/http/query-sanitizer';
import { fetchAllPages } from '@/infra/csv/fetch-all-pages';
import { buildCsv, csvResponse } from '@/infra/csv/csv';

type AcademyRow = {
  academyId: string;
  academyName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  status: string;
  tierKey: string | null;
  activeStudentCount: number | null;
  staffCount: number | null;
  thisMonthRevenueTotal: number | null;
  createdAt: string;
};

const HEADERS = [
  'Academy ID',
  'Academy name',
  'Owner name',
  'Owner email',
  'Owner phone',
  'Status',
  'Tier',
  'Active students',
  'Staff',
  'This-month revenue (INR)',
  'Created at',
];

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get('status') ?? undefined;
  const tier = sp.get('tier') ?? undefined;
  const search = (sanitizeQueryValue((sp.get('search') ?? '').slice(0, 80)) ?? '') || undefined;

  if (status && !(ADMIN_ACADEMY_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }
  if (tier && !(TIER_KEYS as readonly string[]).includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier filter' }, { status: 400 });
  }

  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (tier) query.set('tierKey', tier);
  if (search) query.set('search', search);

  const result = await fetchAllPages<AcademyRow>({
    accessToken,
    basePath: '/api/v1/admin/academies',
    query,
  });

  if (!result.ok) {
    if (result.status === 401) await handleBackend401();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const rows = result.items.map((a) => [
    a.academyId,
    a.academyName,
    a.ownerName,
    a.ownerEmail,
    a.ownerPhone,
    a.status,
    a.tierKey,
    a.activeStudentCount,
    a.staffCount,
    a.thisMonthRevenueTotal,
    a.createdAt,
  ]);

  const csv = buildCsv(HEADERS, rows);
  return csvResponse(csv, 'academies');
}
