import { escapeHtml, renderEmailLayout, type EmailInfoRow } from './_email-layout';

export interface HolidayDeclaredTemplateData {
  parentName: string;
  academyName: string;
  date: string;
  reason: string | null;
}

export function renderHolidayDeclaredEmail(data: HolidayDeclaredTemplateData): string {
  const rows: EmailInfoRow[] = [
    { label: 'Date', value: escapeHtml(data.date) },
  ];
  if (data.reason) rows.push({ label: 'Reason', value: escapeHtml(data.reason) });

  return renderEmailLayout({
    preheader: `${data.academyName} will be closed on ${data.date}.`,
    title: 'Holiday notification',
    greeting: `Dear ${data.parentName},`,
    tone: 'info',
    body: `
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        <strong>${escapeHtml(data.academyName)}</strong> will be closed on
        <strong>${escapeHtml(data.date)}</strong>. Regular classes will resume on the next working day.
      </p>
    `,
    infoRows: rows,
  });
}
