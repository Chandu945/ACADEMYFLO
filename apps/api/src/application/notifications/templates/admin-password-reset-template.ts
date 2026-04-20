import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface AdminPasswordResetTemplateData {
  ownerName: string;
  academyName: string;
  tempPassword: string;
}

export function renderAdminPasswordResetEmail(data: AdminPasswordResetTemplateData): string {
  return renderEmailLayout({
    preheader: 'Your Academyflo password has been reset by an administrator.',
    title: 'Your password was reset',
    greeting: `Dear ${data.ownerName},`,
    tone: 'warning',
    body: `
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        The password for your <strong>${escapeHtml(data.academyName)}</strong> account has been reset by
        an Academyflo administrator. Use the temporary password below to sign in, and change it to something you'll
        remember as soon as you're in.
      </p>
    `,
    infoRows: [
      { label: 'Temporary password', value: escapeHtml(data.tempPassword), mono: true },
    ],
    cta: { label: 'Sign in and change password', url: 'https://academyflo.com/login' },
    footerNote: 'If you didn\'t expect this reset, please write to support@academyflo.com right away.',
  });
}
