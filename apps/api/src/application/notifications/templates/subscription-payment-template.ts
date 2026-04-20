import { escapeHtml, formatInr, renderEmailLayout } from './_email-layout';

export interface SubscriptionPaymentSuccessData {
  ownerName: string;
  academyName: string;
  tierKey: string;
  amountInr: number;
  orderId: string;
}

export function renderSubscriptionPaymentSuccessEmail(data: SubscriptionPaymentSuccessData): string {
  return renderEmailLayout({
    preheader: `${formatInr(data.amountInr)} received — ${data.academyName} subscription is active.`,
    title: 'Payment received, subscription active',
    greeting: `Dear ${data.ownerName},`,
    tone: 'success',
    body: `
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        Thank you — we've successfully processed your subscription payment for
        <strong>${escapeHtml(data.academyName)}</strong>. Your plan is active and all features are unlocked.
      </p>
    `,
    infoRows: [
      { label: 'Plan', value: escapeHtml(data.tierKey) },
      { label: 'Amount paid', value: formatInr(data.amountInr) },
      { label: 'Order ID', value: escapeHtml(data.orderId), mono: true },
    ],
    cta: { label: 'View subscription', url: 'https://academyflo.com/subscription' },
    footerNote: 'A tax invoice will be available on the Subscription page within 24 hours.',
  });
}

export interface SubscriptionPaymentFailedData {
  ownerName: string;
  academyName: string;
  tierKey: string;
  amountInr: number;
  orderId: string;
  reason: string;
}

export function renderSubscriptionPaymentFailedEmail(data: SubscriptionPaymentFailedData): string {
  return renderEmailLayout({
    preheader: `Your subscription payment of ${formatInr(data.amountInr)} could not be processed.`,
    title: 'Subscription payment failed',
    greeting: `Dear ${data.ownerName},`,
    tone: 'danger',
    body: `
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        Your subscription payment for <strong>${escapeHtml(data.academyName)}</strong> could not be processed.
        No amount has been debited from your account. If anything was deducted, it will be auto-refunded within
        5–7 working days.
      </p>
    `,
    infoRows: [
      { label: 'Plan', value: escapeHtml(data.tierKey) },
      { label: 'Amount', value: formatInr(data.amountInr) },
      { label: 'Order ID', value: escapeHtml(data.orderId), mono: true },
      { label: 'Reason', value: escapeHtml(data.reason) },
    ],
    cta: { label: 'Try payment again', url: 'https://academyflo.com/subscription' },
    footerNote: 'If the issue keeps happening, reply to this email and our support team will help you out.',
  });
}
