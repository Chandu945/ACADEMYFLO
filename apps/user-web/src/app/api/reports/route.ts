import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { buildSafeParams } from '@/infra/http/query-sanitizer';
import { serverEnv } from '@/infra/env';

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'monthly-revenue';
  const format = searchParams.get('format');
  const month = searchParams.get('month');

  // PDF export path — stream raw backend PDF body back to the caller.
  // `window.open(...)` on the reports page uses the session cookie, so we
  // resolve the Bearer token server-side and forward to the backend.
  if (format === 'pdf') {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ message: "month must be 'YYYY-MM'" }, { status: 400 });
    }
    const backendPath = resolvePdfBackendPath(type);
    if (!backendPath) {
      return NextResponse.json(
        { message: `PDF export is not available for report type '${type}' yet` },
        { status: 501 },
      );
    }
    return proxyPdf(backendPath, month, accessToken);
  }

  // Common JSON-path validation: every report below accepts month and most
  // accept page/pageSize. Reject obvious garbage at the BFF so the backend
  // doesn't have to triage it.
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ message: "month must be 'YYYY-MM'" }, { status: 400 });
  }
  const pageRaw = searchParams.get('page');
  const pageSizeRaw = searchParams.get('pageSize');
  if (pageRaw && (!/^\d+$/.test(pageRaw) || Number(pageRaw) < 1)) {
    return NextResponse.json({ message: 'page must be a positive integer' }, { status: 400 });
  }
  if (pageSizeRaw) {
    if (!/^\d+$/.test(pageSizeRaw)) {
      return NextResponse.json({ message: 'pageSize must be a positive integer' }, { status: 400 });
    }
    const ps = Number(pageSizeRaw);
    if (ps < 1 || ps > 100) {
      return NextResponse.json({ message: 'pageSize must be between 1 and 100' }, { status: 400 });
    }
  }

  if (type === 'monthly-revenue') {
    const params = buildSafeParams({ month: month || undefined });
    const result = await apiGet(`/api/v1/reports/monthly-revenue?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'student-wise-dues') {
    const params = buildSafeParams({
      month: month || undefined,
      page: pageRaw || '1',
      pageSize: pageSizeRaw || '20',
    });
    const result = await apiGet(`/api/v1/reports/student-wise-dues?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  if (type === 'month-wise-dues') {
    const params = buildSafeParams({ month: month || undefined });
    const result = await apiGet(`/api/v1/reports/month-wise-dues?${params}`, { accessToken });
    if (!result.ok) return toErrorResponse(result.error);
    return NextResponse.json(result.data);
  }

  return NextResponse.json({ message: 'Unknown report type' }, { status: 400 });
}

/** Map frontend report-type labels to backend PDF export endpoints. */
function resolvePdfBackendPath(type: string): string | null {
  switch (type) {
    case 'monthly-revenue':
      return '/api/v1/reports/revenue/export.pdf';
    // `student-wise-dues` and `month-wise-dues` don't have dedicated PDF
    // endpoints on the backend yet. The closest existing export is
    // `/reports/dues/pending/export.pdf` but its output shape doesn't match
    // those UI tabs — return 501 so the UI surfaces an actionable error.
    default:
      return null;
  }
}

async function proxyPdf(
  backendPath: string,
  month: string,
  accessToken: string,
): Promise<NextResponse> {
  const { API_BASE_URL } = serverEnv();
  const url = `${API_BASE_URL}${backendPath}?month=${encodeURIComponent(month)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { message: 'Report export failed. Please try again.' },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return new NextResponse(errBody || 'Report export failed', { status: res.status });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) headers.set('Content-Disposition', disposition);
  return new NextResponse(res.body, { status: 200, headers });
}
