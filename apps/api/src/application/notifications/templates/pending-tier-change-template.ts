function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

export interface PendingTierChangeTemplateData {
  ownerName: string;
  academyName: string;
  currentTier: string;
  requiredTier: string;
  activeStudentCount: number;
  requiredTierPrice: number;
}

export function renderPendingTierChangeEmail(data: PendingTierChangeTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const currentTier = escapeHtml(data.currentTier);
  const requiredTier = escapeHtml(data.requiredTier);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Subscription Tier Change Required</h2>
  <p>Dear ${ownerName},</p>
  <p>Your academy <strong>${academyName}</strong> currently has <strong>${data.activeStudentCount} active students</strong>, which requires a plan upgrade.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:4px 12px;font-weight:bold;">Current Plan</td><td style="padding:4px 12px;">${currentTier}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">Required Plan</td><td style="padding:4px 12px;">${requiredTier}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:bold;">New Price</td><td style="padding:4px 12px;">${formatInr(data.requiredTierPrice)}/month</td></tr>
  </table>
  <p>The tier change will take effect at your next renewal. Please visit the Subscription page to review.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
