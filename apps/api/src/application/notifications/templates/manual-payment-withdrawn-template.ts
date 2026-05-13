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
  const [year, mm] = monthKey.split('-');
  const idx = parseInt(mm ?? '0', 10) - 1;
  if (!year || idx < 0 || idx > 11) return monthKey;
  return `${MONTH_NAMES[idx]} ${year}`;
}

export interface ManualPaymentWithdrawnPush {
  title: string;
  body: string;
  data: {
    type: 'MANUAL_PAYMENT_WITHDRAWN';
    academyId: string;
    paymentRequestId: string;
    studentId: string;
    studentName: string;
    monthKey: string;
  };
}

/**
 * Sent to academy owners when a parent cancels their own pending payment
 * request (M5 capability). Without this, the request silently disappears
 * from the owner's queue and they're left wondering what changed (L7).
 *
 * Only fires for PARENT-source cancellations. Staff cancelling their own
 * cash-collection PRs doesn't notify the owner — staff are typically
 * physically nearby and communicate verbally.
 */
export function buildManualPaymentWithdrawnPush(params: {
  studentName: string;
  monthKey: string;
  academyId: string;
  paymentRequestId: string;
  studentId: string;
}): ManualPaymentWithdrawnPush {
  return {
    title: 'Payment proof withdrawn',
    body: `${params.studentName}'s parent cancelled their payment request for ${formatMonthKey(params.monthKey)}.`,
    data: {
      type: 'MANUAL_PAYMENT_WITHDRAWN',
      academyId: params.academyId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      studentName: params.studentName,
      monthKey: params.monthKey,
    },
  };
}
