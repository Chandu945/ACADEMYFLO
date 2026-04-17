function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ParentInviteTemplateData {
  parentName: string;
  studentName: string;
  academyName: string;
  loginEmail: string;
  tempPassword: string;
}

export function renderParentInviteEmail(data: ParentInviteTemplateData): string {
  const parentName = escapeHtml(data.parentName);
  const studentName = escapeHtml(data.studentName);
  const academyName = escapeHtml(data.academyName);
  const loginEmail = escapeHtml(data.loginEmail);
  const tempPassword = escapeHtml(data.tempPassword);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Welcome to ${academyName}</h2>
  <p>Dear ${parentName},</p>
  <p>You have been invited as a parent/guardian of <strong>${studentName}</strong> on <strong>${academyName}</strong>'s Academyflo platform.</p>
  <p>Your login credentials are:</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px; font-weight: bold;">Email</td><td style="padding: 4px 12px;">${loginEmail}</td></tr>
    <tr><td style="padding: 4px 12px; font-weight: bold;">Temporary Password</td><td style="padding: 4px 12px;"><code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></td></tr>
  </table>
  <p>Please log in and change your password immediately for security.</p>
  <p>Thank you,<br>${academyName}</p>
</body>
</html>`;
}
