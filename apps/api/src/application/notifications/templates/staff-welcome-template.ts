import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface StaffWelcomeTemplateData {
  staffName: string;
  academyName: string;
  loginEmail: string;
  loginPhone: string;
}

export function renderStaffWelcomeEmail(data: StaffWelcomeTemplateData): string {
  return renderEmailLayout({
    preheader: `${data.academyName} has added you as staff on Academyflo.`,
    title: `Welcome to ${data.academyName}`,
    greeting: `Dear ${data.staffName},`,
    tone: 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        You've been added as a staff member on
        <strong>${escapeHtml(data.academyName)}</strong>'s Academyflo account.
      </p>
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        You can sign in using either your email or phone number, along with the password shared by your academy owner.
      </p>
    `,
    infoRows: [
      { label: 'Login email', value: escapeHtml(data.loginEmail), mono: true },
      { label: 'Login phone', value: escapeHtml(data.loginPhone), mono: true },
    ],
    cta: { label: 'Sign in to Academyflo', url: 'https://academyflo.com/login' },
    footerNote: 'If you didn\'t expect to be added, please contact your academy owner or write to support@academyflo.com.',
  });
}
