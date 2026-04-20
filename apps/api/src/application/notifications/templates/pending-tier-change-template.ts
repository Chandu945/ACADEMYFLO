import { escapeHtml, formatInr, renderEmailLayout } from './_email-layout';

export interface PendingTierChangeTemplateData {
  ownerName: string;
  academyName: string;
  currentTier: string;
  requiredTier: string;
  activeStudentCount: number;
  requiredTierPrice: number;
}

export function renderPendingTierChangeEmail(data: PendingTierChangeTemplateData): string {
  return renderEmailLayout({
    preheader: `${data.academyName} has grown to ${data.activeStudentCount} students — time to upgrade your plan.`,
    title: 'Plan upgrade needed',
    greeting: `Dear ${data.ownerName},`,
    tone: 'warning',
    body: `
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        <strong>${escapeHtml(data.academyName)}</strong> now has
        <strong>${data.activeStudentCount} active students</strong>, which goes beyond your current plan.
        The new tier will take effect at your next renewal — there's nothing broken right now.
      </p>
    `,
    infoRows: [
      { label: 'Current plan', value: escapeHtml(data.currentTier) },
      { label: 'Required plan', value: escapeHtml(data.requiredTier) },
      { label: 'New price', value: `${formatInr(data.requiredTierPrice)} / month` },
      { label: 'Active students', value: String(data.activeStudentCount) },
    ],
    cta: { label: 'Review subscription', url: 'https://academyflo.com/subscription' },
    footerNote: 'Congratulations on growing your academy — we\'re proud to be part of the journey!',
  });
}
