import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface PasswordChangedTemplateData {
  userName: string;
  userEmail: string;
}

export function renderPasswordChangedEmail(data: PasswordChangedTemplateData): string {
  const userEmail = escapeHtml(data.userEmail);

  return renderEmailLayout({
    preheader: 'Your Academyflo password was changed just now.',
    title: 'Your password was changed',
    greeting: `Dear ${data.userName},`,
    tone: 'info',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        The password for your Academyflo account <strong>${userEmail}</strong> was changed a few moments ago.
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        For your security, we've signed you out of every other device. The next time
        you open Academyflo on those devices, you'll need to log in again with the new password.
      </p>
    `,
    footerNote: 'If this wasn\'t you, please reset your password immediately and contact support@academyflo.com.',
  });
}
