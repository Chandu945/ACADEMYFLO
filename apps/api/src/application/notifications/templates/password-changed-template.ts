function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface PasswordChangedTemplateData {
  userName: string;
  userEmail: string;
}

export function renderPasswordChangedEmail(data: PasswordChangedTemplateData): string {
  const userName = escapeHtml(data.userName);
  const userEmail = escapeHtml(data.userEmail);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Password Changed Successfully</h2>
  <p>Dear ${userName},</p>
  <p>Your password for account <strong>${userEmail}</strong> on Academyflo has been changed successfully.</p>
  <p>All your active sessions on other devices have been signed out for security.</p>
  <p><strong>If you did not make this change, please reset your password immediately or contact support.</strong></p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
