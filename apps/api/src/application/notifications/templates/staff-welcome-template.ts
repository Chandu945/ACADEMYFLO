function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface StaffWelcomeTemplateData {
  staffName: string;
  academyName: string;
  loginEmail: string;
  loginPhone: string;
}

export function renderStaffWelcomeEmail(data: StaffWelcomeTemplateData): string {
  const staffName = escapeHtml(data.staffName);
  const academyName = escapeHtml(data.academyName);
  const loginEmail = escapeHtml(data.loginEmail);
  const loginPhone = escapeHtml(data.loginPhone);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Welcome to ${academyName}</h2>
  <p>Dear ${staffName},</p>
  <p>You have been added as a staff member on <strong>${academyName}</strong>'s Academyflo platform.</p>
  <p>Your login details are:</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px; font-weight: bold;">Email</td><td style="padding: 4px 12px;">${loginEmail}</td></tr>
    <tr><td style="padding: 4px 12px; font-weight: bold;">Phone</td><td style="padding: 4px 12px;">${loginPhone}</td></tr>
  </table>
  <p>You can log in using either your email or phone number along with the password provided by your academy owner.</p>
  <p>Thank you,<br>${academyName}</p>
</body>
</html>`;
}
