import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUDIT_ACTION_TYPES } from '@academyflo/contracts';
import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

type BackendAuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorName: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
};

type BackendResponse = {
  items: BackendAuditLogItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ academyId: string }> },
) {
  const { academyId } = await context.params;

  if (!ACADEMY_ID_RE.test(academyId)) {
    return NextResponse.json({ error: 'Invalid academy id' }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  // Validate and sanitize query params
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10) || 50),
  );
  const fromParam = searchParams.get('from') ?? undefined;
  const toParam = searchParams.get('to') ?? undefined;
  const actionTypeParam = searchParams.get('actionType') ?? undefined;

  // Validate date formats
  if (fromParam && !DATE_RE.test(fromParam)) {
    return NextResponse.json({ error: 'Invalid from date format' }, { status: 400 });
  }
  if (toParam && !DATE_RE.test(toParam)) {
    return NextResponse.json({ error: 'Invalid to date format' }, { status: 400 });
  }
  if (fromParam && toParam && fromParam > toParam) {
    return NextResponse.json({ error: 'from must be before or equal to to' }, { status: 400 });
  }

  // Validate actionType enum
  if (actionTypeParam && !(AUDIT_ACTION_TYPES as readonly string[]).includes(actionTypeParam)) {
    return NextResponse.json({ error: 'Invalid action type filter' }, { status: 400 });
  }

  // Build backend query string
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (fromParam) params.set('from', fromParam);
  if (toParam) params.set('to', toParam);
  if (actionTypeParam) params.set('action', actionTypeParam);

  const result = await apiGet<BackendResponse>(
    `/api/v1/admin/academies/${encodeURIComponent(academyId)}/audit-logs?${params.toString()}`,
    { accessToken },
  );

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (result.error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const { items, meta } = result.data;

  // Normalize backend shape to client shape
  const normalizedItems = items.map((item) => ({
    id: item.id,
    occurredAt: item.createdAt,
    actor: { userId: item.actorUserId, name: item.actorName ?? null },
    actionType: item.action,
    entity: { type: item.entityType, id: item.entityId },
    context: item.context ?? {},
  }));

  return NextResponse.json({
    success: true,
    data: {
      items: normalizedItems,
      meta,
    },
  });
}
