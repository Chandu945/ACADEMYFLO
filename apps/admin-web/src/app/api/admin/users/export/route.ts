import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { USER_ROLES } from '@academyflo/contracts';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { fetchAllPages } from '@/infra/csv/fetch-all-pages';
import { buildCsv, csvResponse } from '@/infra/csv/csv';

const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

type UserRow = {
  id: string;
  fullName: string;
  emailNormalized: string;
  phoneE164: string;
  role: string;
  status: string;
  academyId: string | null;
  academyName: string | null;
  createdAt: string;
};

const HEADERS = [
  'User ID',
  'Full name',
  'Email',
  'Phone',
  'Role',
  'Status',
  'Academy ID',
  'Academy name',
  'Created at',
];

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').slice(0, 80).trim() || undefined;
  const role = sp.get('role') ?? undefined;
  const academyId = sp.get('academyId') ?? undefined;
  const status = sp.get('status') ?? undefined;

  if (role && !(USER_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 });
  }
  if (academyId && !ACADEMY_ID_RE.test(academyId)) {
    return NextResponse.json({ error: 'Invalid academyId' }, { status: 400 });
  }
  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (role) query.set('role', role);
  if (academyId) query.set('academyId', academyId);
  if (status) query.set('status', status);

  const result = await fetchAllPages<UserRow>({
    accessToken,
    basePath: '/api/v1/admin/users',
    query,
  });

  if (!result.ok) {
    if (result.status === 401) await handleBackend401();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const rows = result.items.map((u) => [
    u.id,
    u.fullName,
    u.emailNormalized,
    u.phoneE164,
    u.role,
    u.status,
    u.academyId,
    u.academyName,
    u.createdAt,
  ]);

  const csv = buildCsv(HEADERS, rows);
  return csvResponse(csv, 'users');
}
