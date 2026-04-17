function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface TrialStartedTemplateData {
  ownerName: string;
  academyName: string;
  trialEndDate: string;
  trialDurationDays: number;
}

export function renderTrialStartedEmail(data: TrialStartedTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const trialEndDate = escapeHtml(data.trialEndDate);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Your Free Trial Has Started!</h2>
  <p>Dear ${ownerName},</p>
  <p>Your <strong>${data.trialDurationDays}-day free trial</strong> for <strong>${academyName}</strong> on Academyflo is now active.</p>
  <p>Your trial expires on <strong>${trialEndDate}</strong>. During this period, you have full access to all features.</p>
  <p>To continue using Academyflo after your trial ends, subscribe to a plan from the Subscription page.</p>
  <p>Happy managing!<br>Academyflo Team</p>
</body></html>`;
}
