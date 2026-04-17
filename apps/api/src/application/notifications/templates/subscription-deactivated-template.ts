function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface SubscriptionDeactivatedTemplateData {
  ownerName: string;
  academyName: string;
}

export function renderSubscriptionDeactivatedEmail(data: SubscriptionDeactivatedTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Subscription Deactivated</h2>
  <p>Dear ${ownerName},</p>
  <p>The subscription for <strong>${academyName}</strong> has been deactivated by the administrator.</p>
  <p>Your academy access may be restricted. Please contact the administrator or renew your subscription to restore full access.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
