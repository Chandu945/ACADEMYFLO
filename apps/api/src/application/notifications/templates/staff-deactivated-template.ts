function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface StaffDeactivatedTemplateData {
  staffName: string;
  academyName: string;
  newStatus: string;
}

export function renderStaffDeactivatedEmail(data: StaffDeactivatedTemplateData): string {
  const staffName = escapeHtml(data.staffName);
  const academyName = escapeHtml(data.academyName);
  const isDeactivated = data.newStatus === 'INACTIVE';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Account Status Updated</h2>
  <p>Dear ${staffName},</p>
  <p>Your staff account at <strong>${academyName}</strong> has been ${isDeactivated ? '<strong style="color:#d97706;">deactivated</strong>' : '<strong style="color:#16a34a;">reactivated</strong>'}.</p>
  ${isDeactivated
    ? '<p>You will no longer be able to log in until the academy owner reactivates your account. All your active sessions have been revoked.</p>'
    : '<p>You can now log in again with your existing credentials.</p>'}
  <p>If you have questions, please contact your academy owner.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
