function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

export interface SubscriptionPaymentSuccessData {
  ownerName: string;
  academyName: string;
  tierKey: string;
  amountInr: number;
  orderId: string;
}

export function renderSubscriptionPaymentSuccessEmail(data: SubscriptionPaymentSuccessData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const tierKey = escapeHtml(data.tierKey);
  const orderId = escapeHtml(data.orderId);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Subscription Payment Successful</h2>
  <p>Dear ${ownerName},</p>
  <p>Your subscription payment for <strong>${academyName}</strong> has been processed successfully.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:4px 12px;font-weight:bold;">Plan</td><td style="padding:4px 12px;">${tierKey}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Amount</td><td style="padding:4px 12px;">${formatInr(data.amountInr)}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Order ID</td><td style="padding:4px 12px;">${orderId}</td></tr>
  </table>
  <p>Your academy subscription is now active. Thank you for your payment!</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
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
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const reason = escapeHtml(data.reason);
  const orderId = escapeHtml(data.orderId);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Subscription Payment Failed</h2>
  <p>Dear ${ownerName},</p>
  <p>Your subscription payment for <strong>${academyName}</strong> could not be processed.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:4px 12px;font-weight:bold;">Plan</td><td style="padding:4px 12px;">${escapeHtml(data.tierKey)}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Amount</td><td style="padding:4px 12px;">${formatInr(data.amountInr)}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Order ID</td><td style="padding:4px 12px;">${orderId}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Reason</td><td style="padding:4px 12px;">${reason}</td></tr>
  </table>
  <p>Please try again or use a different payment method. If the issue persists, contact support.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
