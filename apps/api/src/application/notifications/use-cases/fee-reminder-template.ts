function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

export interface FeeReminderTemplateData {
  studentName: string;
  academyName: string;
  amount: number;
  dueDate: string;
  monthKey: string;
}

export function renderFeeReminderEmail(data: FeeReminderTemplateData): string {
  const studentName = escapeHtml(data.studentName);
  const academyName = escapeHtml(data.academyName);
  const amount = formatInr(data.amount);
  const dueDate = escapeHtml(data.dueDate);
  const monthKey = escapeHtml(data.monthKey);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Fee Reminder</h2>
  <p>Dear Parent/Guardian,</p>
  <p>This is a reminder that the fee for <strong>${studentName}</strong> at <strong>${academyName}</strong> is due soon.</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px; font-weight: bold;">Month</td><td style="padding: 4px 12px;">${monthKey}</td></tr>
    <tr><td style="padding: 4px 12px; font-weight: bold;">Amount</td><td style="padding: 4px 12px;">${amount}</td></tr>
    <tr><td style="padding: 4px 12px; font-weight: bold;">Due Date</td><td style="padding: 4px 12px;">${dueDate}</td></tr>
  </table>
  <p>Please ensure timely payment to avoid any inconvenience.</p>
  <p>Thank you,<br>${academyName}</p>
</body>
</html>`;
}
