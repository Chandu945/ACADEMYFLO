import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { USER_ROLES } from '@academyflo/contracts';
import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';

const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

type BackendItem = {
  id: string;
  fullName: string;
  emailNormalized: string;
  phoneE164: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  academyId: string | null;
  academyName: string | null;
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
  const pageSize = clampInt(sp.get('pageSize'), 25, 1, 100);
  const q = (sp.get('q') ?? '').slice(0, 80);
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

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (q.trim()) params.set('q', q.trim());
  if (role) params.set('role', role);
  if (academyId) params.set('academyId', academyId);
  if (status) params.set('status', status);

  const result = await apiGet<BackendResponse>(`/api/v1/admin/users?${params.toString()}`, {
    accessToken,
  });

  if (!result.ok) {
    if (result.error.code === 'UNAUTHORIZED') {
      await handleBackend401();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
