function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface AdminPasswordResetTemplateData {
  ownerName: string;
  academyName: string;
  tempPassword: string;
}

export function renderAdminPasswordResetEmail(data: AdminPasswordResetTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const tempPassword = escapeHtml(data.tempPassword);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Password Reset - ${academyName}</h2>
  <p>Dear ${ownerName},</p>
  <p>Your password for <strong>${academyName}</strong> on Academyflo has been reset by the administrator.</p>
  <p>Your temporary password is:</p>
  <p style="margin: 16px 0; padding: 12px; background: #f4f4f4; border-radius: 6px; font-size: 18px; letter-spacing: 1px; text-align: center;">
    <code>${tempPassword}</code>
  </p>
  <p><strong>Please log in and change your password immediately.</strong></p>
  <p>If you did not expect this reset, please contact your administrator.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body>
</html>`;
}
