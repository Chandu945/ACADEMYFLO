import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface ParentInviteTemplateData {
  parentName: string;
  studentName: string;
  academyName: string;
  loginEmail: string;
  tempPassword: string;
}

export function renderParentInviteEmail(data: ParentInviteTemplateData): string {
  return renderEmailLayout({
    preheader: `${data.academyName} has invited you to track ${data.studentName} on Academyflo.`,
    title: `Welcome to ${data.academyName}`,
    greeting: `Dear ${data.parentName},`,
    tone: 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        You've been invited as the parent / guardian of
        <strong>${escapeHtml(data.studentName)}</strong> on
        <strong>${escapeHtml(data.academyName)}</strong>'s Academyflo account.
      </p>
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;color:#0F172A;">
        Use the credentials below to log in. Please change the temporary password as soon as you sign in.
      </p>
    `,
    infoRows: [
      { label: 'Login email', value: escapeHtml(data.loginEmail), mono: true },
      { label: 'Temporary password', value: escapeHtml(data.tempPassword), mono: true },
    ],
    cta: { label: 'Sign in to Academyflo', url: 'https://academyflo.com/login' },
    footerNote: `If you didn't expect this invitation, please ignore this email. For help, contact ${escapeHtml(data.academyName)} directly or write to support@academyflo.com.`,
  });
}
