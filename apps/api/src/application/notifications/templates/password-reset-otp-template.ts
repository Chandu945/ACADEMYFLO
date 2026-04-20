import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface PasswordResetOtpTemplateData {
  otp: string;
  expiryMinutes: number;
}

export function renderPasswordResetOtpEmail(data: PasswordResetOtpTemplateData): string {
  return renderEmailLayout({
    preheader: `Your Academyflo reset code: ${data.otp} (valid ${data.expiryMinutes} min)`,
    title: 'Reset your password',
    tone: 'info',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        We received a request to reset your Academyflo password. Enter the code below in the app to set a new one.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td style="padding:16px 24px;background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;">
            <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#0F172A;">
              ${escapeHtml(data.otp)}
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:15px;line-height:22px;color:#64748B;">
        This code expires in <strong>${data.expiryMinutes} minutes</strong>.
      </p>
    `,
    footerNote: 'Didn\'t ask to reset your password? You can safely ignore this email — your account stays the way it is. For help, reach us at support@academyflo.com.',
  });
}
