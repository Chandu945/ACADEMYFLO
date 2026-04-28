import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@academyflo/contracts';
import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { sanitizeQueryValue } from '@/infra/http/query-sanitizer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

type BackendItem = {
  id: string;
  academyId: string;
  academyName: string | null;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  context: Record<string, string> | null;
  createdAt: string;
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

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (action) params.set('action', sanitizeQueryValue(action) ?? '');
  if (entityType) params.set('entityType', sanitizeQueryValue(entityType) ?? '');
  if (academyId) params.set('academyId', academyId);
  if (actorUserId) params.set('actorUserId', actorUserId);

  const result = await apiGet<BackendResponse>(`/api/v1/admin/audit-logs?${params.toString()}`, {
    accessToken,
  });

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Normalize to the client's nested shape (consistent with per-academy
  // audit log page) and surface academy name for display.
  const items = result.data.items.map((item) => ({
    id: item.id,
    occurredAt: item.createdAt,
    actor: { userId: item.actorUserId, name: item.actorName ?? null },
    academy: { id: item.academyId, name: item.academyName ?? null },
    actionType: item.action,
    entity: { type: item.entityType, id: item.entityId },
    context: item.context ?? {},
  }));

  return NextResponse.json({
    success: true,
    data: { items, meta: result.data.meta },
  });
}
