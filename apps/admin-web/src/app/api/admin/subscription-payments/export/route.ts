import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveAccessToken, handleBackend401 } from '@/infra/auth/bff-auth';
import { fetchAllPages } from '@/infra/csv/fetch-all-pages';
import { buildCsv, csvResponse } from '@/infra/csv/csv';

const ACADEMY_ID_RE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;

type PaymentRow = {
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
  status: string;
  failureReason: string | null;
  paidAt: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

const HEADERS = [
  'Created at',
  'Order ID',
  'Cashfree order ID',
  'Cashfree payment ID',
  'Academy ID',
  'Academy name',
  'Owner name',
  'Owner email',
  'Tier',
  'Amount (INR)',
  'Currency',
  'Students at purchase',
  'Status',
  'Failure reason',
  'Paid at',
  'Updated at',
];

export async function GET(request: NextRequest) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get('status') ?? undefined;
  const academyId = sp.get('academyId') ?? undefined;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const stuckRaw = sp.get('stuckThresholdMinutes');

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

  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (academyId) query.set('academyId', academyId);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  if (stuckRaw && /^\d+$/.test(stuckRaw)) query.set('stuckThresholdMinutes', stuckRaw);

  const result = await fetchAllPages<PaymentRow>({
    accessToken,
    basePath: '/api/v1/admin/subscription-payments',
    query,
  });

  if (!result.ok) {
    if (result.status === 401) await handleBackend401();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const rows = result.items.map((p) => [
    p.createdAt,
    p.orderId,
    p.cfOrderId,
    p.providerPaymentId,
    p.academyId,
    p.academyName,
    p.ownerName,
    p.ownerEmail,
    p.tierKey,
    p.amountInr,
    p.currency,
    p.activeStudentCountAtPurchase,
    p.status,
    p.failureReason,
    p.paidAt,
    p.updatedAt,
  ]);

  const csv = buildCsv(HEADERS, rows);
  return csvResponse(csv, 'subscription_payments');
}
