import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface OwnerWelcomeTemplateData {
  ownerName: string;
  email: string;
}

export function renderOwnerWelcomeEmail(data: OwnerWelcomeTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);

  return renderEmailLayout({
    preheader: 'Your Academyflo account is ready — start your 30-day free trial.',
    title: 'Welcome to Academyflo',
    greeting: `Dear ${data.ownerName},`,
    tone: 'success',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Thank you for signing up. Your owner account has been created successfully
        and your <strong>30-day free trial</strong> is now active.
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#0F172A;font-weight:600;">Next steps</p>
      <ol style="margin:0 0 8px 20px;padding:0;font-size:15px;line-height:22px;color:#0F172A;">
        <li style="margin-bottom:6px;">Set up your academy profile — name, address, and working days.</li>
        <li style="margin-bottom:6px;">Create your batches and add staff members.</li>
        <li style="margin-bottom:6px;">Start adding students and tracking attendance.</li>
      </ol>
      <p style="margin:16px 0 0;font-size:16px;line-height:24px;color:#0F172A;">
        Welcome aboard, ${ownerName} — we're glad you're here.
      </p>
    `,
    infoRows: [{ label: 'Login email', value: escapeHtml(data.email), mono: true }],
    cta: { label: 'Open Academyflo', url: 'https://academyflo.com/login' },
    footerNote: 'If you did not create an account on Academyflo, please ignore this email or contact us at support@academyflo.com.',
  });
}
