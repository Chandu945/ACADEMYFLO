function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface AcademyLoginDisabledTemplateData {
  recipientName: string;
  academyName: string;
  disabled: boolean;
}

export function renderAcademyLoginDisabledEmail(data: AcademyLoginDisabledTemplateData): string {
  const recipientName = escapeHtml(data.recipientName);
  const academyName = escapeHtml(data.academyName);
  const action = data.disabled ? 'disabled' : 're-enabled';
  const detail = data.disabled
    ? 'All active sessions have been revoked. You will not be able to log in until the administrator re-enables access.'
    : 'You can now log in again with your existing credentials.';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Academy Login ${data.disabled ? 'Disabled' : 'Re-Enabled'}</h2>
  <p>Dear ${recipientName},</p>
  <p>Login access for <strong>${academyName}</strong> has been <strong>${action}</strong> by the administrator.</p>
  <p>${detail}</p>
  <p>If you have questions, please contact your administrator.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
