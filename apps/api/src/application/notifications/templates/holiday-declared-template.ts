function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface HolidayDeclaredTemplateData {
  parentName: string;
  academyName: string;
  date: string;
  reason: string | null;
}

export function renderHolidayDeclaredEmail(data: HolidayDeclaredTemplateData): string {
  const parentName = escapeHtml(data.parentName);
  const academyName = escapeHtml(data.academyName);
  const date = escapeHtml(data.date);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Holiday Notification</h2>
  <p>Dear ${parentName},</p>
  <p><strong>${academyName}</strong> has declared a holiday on <strong>${date}</strong>.</p>
  ${data.reason ? `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>` : ''}
  <p>Regular classes will resume on the next working day.</p>
  <p>Thank you,<br>${academyName}</p>
</body></html>`;
}
