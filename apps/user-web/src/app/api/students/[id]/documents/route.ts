import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { serverEnv } from '@/infra/env';
import { isValidObjectId } from '@/infra/validation/ids';

type Params = { params: Promise<{ id: string }> };

/**
 * Proxy PDF document generation endpoints.
 * Supported types via ?type= query param: report, registration-form, id-card
 */
export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid student id' }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const docType = searchParams.get('type');

  if (!docType || !['report', 'registration-form', 'id-card'].includes(docType)) {
    return NextResponse.json({ message: 'type must be one of: report, registration-form, id-card' }, { status: 400 });
  }

  const { API_BASE_URL } = serverEnv();
  const query = new URLSearchParams();
  if (docType === 'report') {
    const fromMonth = searchParams.get('fromMonth');
    const toMonth = searchParams.get('toMonth');
    if (fromMonth) query.set('fromMonth', fromMonth);
    if (toMonth) query.set('toMonth', toMonth);
  }
  const qs = query.toString() ? `?${query.toString()}` : '';
  const url = `${API_BASE_URL}/api/v1/students/${encodeURIComponent(id)}/documents/${docType}${qs}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ message: 'Network error' }, { status: 502 });
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return NextResponse.json(
      { message: (json as Record<string, string> | null)?.['error'] ?? 'Failed to generate document' },
      { status: res.status },
    );
  }

  const buffer = await res.arrayBuffer();

  // Generate the filename locally instead of trusting the upstream Content-Disposition.
  // Upstream could return a malicious filename (CRLF / path-traversal / quote-escape);
  // since we know docType and id at this layer, we can emit a safe deterministic name.
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${docType}-${safeId}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
