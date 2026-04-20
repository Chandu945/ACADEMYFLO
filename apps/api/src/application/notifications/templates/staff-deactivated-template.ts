import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface StaffDeactivatedTemplateData {
  staffName: string;
  academyName: string;
  newStatus: string;
}

export function renderStaffDeactivatedEmail(data: StaffDeactivatedTemplateData): string {
  const isDeactivated = data.newStatus === 'INACTIVE';
  const title = isDeactivated ? 'Your staff account was deactivated' : 'Your staff account was reactivated';
  const action = isDeactivated ? 'deactivated' : 'reactivated';
  const detail = isDeactivated
    ? 'You will not be able to log in until the academy owner reactivates your account. All your active sessions have been signed out.'
    : 'You can now log in again with your existing credentials.';

  return renderEmailLayout({
    preheader: `Your access to ${data.academyName} has been ${action}.`,
    title,
    greeting: `Dear ${data.staffName},`,
    tone: isDeactivated ? 'warning' : 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Your staff account at <strong>${escapeHtml(data.academyName)}</strong> has been
        <strong>${action}</strong>.
      </p>
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        ${escapeHtml(detail)}
      </p>
    `,
    cta: isDeactivated
      ? undefined
      : { label: 'Sign in to Academyflo', url: 'https://academyflo.com/login' },
    footerNote: 'If you have any questions, please contact your academy owner.',
  });
}
