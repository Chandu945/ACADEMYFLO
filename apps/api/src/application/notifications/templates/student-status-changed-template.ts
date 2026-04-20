import { escapeHtml, renderEmailLayout, type EmailInfoRow } from './_email-layout';

export interface StudentStatusChangedTemplateData {
  parentName: string;
  studentName: string;
  academyName: string;
  newStatus: string;
  reason: string | null;
}

export function renderStudentStatusChangedEmail(data: StudentStatusChangedTemplateData): string {
  const rows: EmailInfoRow[] = [
    { label: 'Student', value: escapeHtml(data.studentName) },
    { label: 'New status', value: escapeHtml(data.newStatus) },
  ];
  if (data.reason) rows.push({ label: 'Reason', value: escapeHtml(data.reason) });

  return renderEmailLayout({
    preheader: `${data.studentName}'s enrollment status has changed to ${data.newStatus}.`,
    title: 'Enrollment status updated',
    greeting: `Dear ${data.parentName},`,
    tone: 'info',
    body: `
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        The enrollment status of <strong>${escapeHtml(data.studentName)}</strong> at
        <strong>${escapeHtml(data.academyName)}</strong> has been updated.
      </p>
    `,
    infoRows: rows,
    footerNote: `If you have questions about this change, please contact ${escapeHtml(data.academyName)} directly.`,
  });
}
