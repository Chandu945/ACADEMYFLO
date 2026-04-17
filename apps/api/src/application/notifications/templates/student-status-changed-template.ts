function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface StudentStatusChangedTemplateData {
  parentName: string;
  studentName: string;
  academyName: string;
  newStatus: string;
  reason: string | null;
}

export function renderStudentStatusChangedEmail(data: StudentStatusChangedTemplateData): string {
  const parentName = escapeHtml(data.parentName);
  const studentName = escapeHtml(data.studentName);
  const academyName = escapeHtml(data.academyName);
  const newStatus = escapeHtml(data.newStatus);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Student Status Updated</h2>
  <p>Dear ${parentName},</p>
  <p>The enrollment status of <strong>${studentName}</strong> at <strong>${academyName}</strong> has been changed to <strong>${newStatus}</strong>.</p>
  ${data.reason ? `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>` : ''}
  <p>If you have any questions regarding this change, please contact the academy.</p>
  <p>Thank you,<br>${academyName}</p>
</body></html>`;
}
