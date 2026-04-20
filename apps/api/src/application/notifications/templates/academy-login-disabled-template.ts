import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface AcademyLoginDisabledTemplateData {
  recipientName: string;
  academyName: string;
  disabled: boolean;
}

export function renderAcademyLoginDisabledEmail(data: AcademyLoginDisabledTemplateData): string {
  const title = data.disabled ? 'Login temporarily disabled' : 'Login re-enabled';
  const actionWord = data.disabled ? 'disabled' : 're-enabled';
  const detail = data.disabled
    ? 'All active sessions have been revoked. You will not be able to log in until the administrator re-enables access.'
    : 'You can now log in again with your existing credentials.';

  return renderEmailLayout({
    preheader: `Login for ${data.academyName} has been ${actionWord}.`,
    title,
    greeting: `Dear ${data.recipientName},`,
    tone: data.disabled ? 'warning' : 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Login access for <strong>${escapeHtml(data.academyName)}</strong> has been
        <strong>${actionWord}</strong> by the Academyflo administrator.
      </p>
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        ${escapeHtml(detail)}
      </p>
    `,
    cta: data.disabled
      ? undefined
      : { label: 'Sign in to Academyflo', url: 'https://academyflo.com/login' },
    footerNote: 'Questions? Reply to this email or write to support@academyflo.com.',
  });
}
