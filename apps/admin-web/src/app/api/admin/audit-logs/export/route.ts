import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@academyflo/contracts';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { fetchAllPages } from '@/infra/csv/fetch-all-pages';
import { buildCsv, csvResponse } from '@/infra/csv/csv';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

type AuditRow = {
  id: string;
  academyId: string;
  academyName: string | null;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  context: Record<string, unknown> | null;
  createdAt: string;
};

const HEADERS = [
  'Occurred at',
  'Action',
  'Academy ID',
  'Academy name',
  'Actor user ID',
  'Actor name',
  'Entity type',
  'Entity ID',
  'Context (JSON)',
];

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const action = sp.get('action') ?? undefined;
  const entityType = sp.get('entityType') ?? undefined;
  const academyId = sp.get('academyId') ?? undefined;
  const actorUserId = sp.get('actorUserId') ?? undefined;

  if (from && !DATE_RE.test(from)) {
    return NextResponse.json({ error: 'from must be YYYY-MM-DD' }, { status: 400 });
  }
  if (to && !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (action && !(AUDIT_ACTION_TYPES as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'Invalid action filter' }, { status: 400 });
  }
  if (entityType && !(AUDIT_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType filter' }, { status: 400 });
  }
  if (academyId && !ACADEMY_ID_RE.test(academyId)) {
    return NextResponse.json({ error: 'Invalid academyId' }, { status: 400 });
  }
  if (actorUserId && !ACADEMY_ID_RE.test(actorUserId)) {
    return NextResponse.json({ error: 'Invalid actorUserId' }, { status: 400 });
  }

  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  if (action) query.set('action', action);
  if (entityType) query.set('entityType', entityType);
  if (academyId) query.set('academyId', academyId);
  if (actorUserId) query.set('actorUserId', actorUserId);

  const result = await fetchAllPages<AuditRow>({
    accessToken,
    basePath: '/api/v1/admin/audit-logs',
    query,
  });

  if (!result.ok) {
    if (result.status === 401) await handleBackend401();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const rows = result.items.map((e) => [
    e.createdAt,
    e.action,
    e.academyId,
    e.academyName,
    e.actorUserId,
    e.actorName,
    e.entityType,
    e.entityId,
    e.context ? JSON.stringify(e.context) : null,
  ]);

  const csv = buildCsv(HEADERS, rows);
  return csvResponse(csv, 'audit_logs');
}
