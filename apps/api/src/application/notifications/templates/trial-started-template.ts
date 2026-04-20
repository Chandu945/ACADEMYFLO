import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface TrialStartedTemplateData {
  ownerName: string;
  academyName: string;
  trialEndDate: string;
  trialDurationDays: number;
}

export function renderTrialStartedEmail(data: TrialStartedTemplateData): string {
  return renderEmailLayout({
    preheader: `Your ${data.trialDurationDays}-day trial is active until ${data.trialEndDate}.`,
    title: 'Your free trial is live',
    greeting: `Dear ${data.ownerName},`,
    tone: 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Your <strong>${data.trialDurationDays}-day free trial</strong> for
        <strong>${escapeHtml(data.academyName)}</strong> is now active. Every feature on Academyflo is
        available to you during the trial — no credit card required.
      </p>
    `,
    infoRows: [
      { label: 'Trial ends on', value: escapeHtml(data.trialEndDate) },
      { label: 'Duration', value: `${data.trialDurationDays} days` },
    ],
    cta: { label: 'Start exploring', url: 'https://academyflo.com/dashboard' },
    footerNote: 'Before the trial ends, head to the Subscription page to pick a plan and keep your academy running smoothly.',
  });
}
