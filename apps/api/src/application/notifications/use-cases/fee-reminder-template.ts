import { escapeHtml, formatInr, renderEmailLayout } from '../templates/_email-layout';

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

  return renderEmailLayout({
    preheader: `${monthKey} fee for ${data.studentName} is due on ${data.dueDate}`,
    title: 'Fee reminder',
    greeting: 'Dear Parent / Guardian,',
    tone: 'warning',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        This is a friendly reminder that the monthly fee for
        <strong>${studentName}</strong> at <strong>${academyName}</strong> is due soon.
      </p>
    `,
    infoRows: [
      { label: 'Month', value: monthKey },
      { label: 'Amount', value: amount },
      { label: 'Due date', value: dueDate },
    ],
    footerNote: 'Please ensure timely payment to avoid any inconvenience. If you have already paid, you can safely ignore this reminder.',
  });
}
