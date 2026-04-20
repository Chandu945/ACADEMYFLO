import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface SubscriptionDeactivatedTemplateData {
  ownerName: string;
  academyName: string;
}

export function renderSubscriptionDeactivatedEmail(data: SubscriptionDeactivatedTemplateData): string {
  return renderEmailLayout({
    preheader: `${data.academyName}'s Academyflo subscription has been deactivated.`,
    title: 'Subscription deactivated',
    greeting: `Dear ${data.ownerName},`,
    tone: 'danger',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        The Academyflo subscription for <strong>${escapeHtml(data.academyName)}</strong> has been deactivated
        by our administrator. Until it is re-activated, access to most features will be restricted.
      </p>
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        To restore full access, please renew your subscription or get in touch so we can help resolve the issue.
      </p>
    `,
    cta: { label: 'Renew subscription', url: 'https://academyflo.com/subscription' },
    footerNote: 'Need help or believe this was a mistake? Reply to this email or write to support@academyflo.com.',
  });
}
