const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatMonthKey(monthKey: string): string {
  // monthKey is "YYYY-MM" (validated upstream); fall back to verbatim
  // rather than throw if a malformed value sneaks through — the push is
  // advisory and degrading to "Apr 2026 ?" is safer than crashing the
  // payment-request creation.
  const [year, mm] = monthKey.split('-');
  const idx = parseInt(mm ?? '0', 10) - 1;
  if (!year || idx < 0 || idx > 11) return monthKey;
  return `${MONTH_NAMES[idx]} ${year}`;
}

export interface PaymentRequestPendingPush {
  title: string;
  body: string;
  data: {
    type: 'PAYMENT_REQUEST_PENDING';
    academyId: string;
    paymentRequestId: string;
    studentId: string;
    monthKey: string;
  };
}

export function buildPaymentRequestPendingPush(params: {
  staffName: string;
  studentName: string;
  monthKey: string;
  amount: number;
  academyId: string;
  paymentRequestId: string;
  studentId: string;
}): PaymentRequestPendingPush {
  return {
    title: 'New payment request',
    body: `${params.staffName} requested ₹${params.amount} for ${params.studentName} (${formatMonthKey(params.monthKey)}).`,
    data: {
      type: 'PAYMENT_REQUEST_PENDING',
      academyId: params.academyId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      monthKey: params.monthKey,
    },
  };
}
