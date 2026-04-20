import { escapeHtml, renderEmailLayout } from './_email-layout';

export interface AccountDeletionRequestedData {
  ownerName: string;
  academyName: string;
  scheduledDate: string;
}

export function renderAccountDeletionRequestedEmail(data: AccountDeletionRequestedData): string {
  return renderEmailLayout({
    preheader: `Your account deletion is scheduled for ${data.scheduledDate}. You can cancel anytime before then.`,
    title: 'Account deletion scheduled',
    greeting: `Dear ${data.ownerName},`,
    tone: 'warning',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        We've received your request to delete the Academyflo account for
        <strong>${escapeHtml(data.academyName)}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Your account and all associated data will be <strong>permanently deleted on ${escapeHtml(data.scheduledDate)}</strong>.
        You have a 30-day cooling-off period — you can cancel the deletion anytime before that date from the
        <em>Delete account</em> page.
      </p>
      <p style="margin:0;font-size:15px;line-height:22px;color:#B45309;background-color:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:12px 14px;">
        <strong>Once deletion runs, it cannot be undone.</strong> All staff, students, attendance, fees, and expense records will be permanently removed.
      </p>
    `,
    cta: { label: 'Cancel deletion', url: 'https://academyflo.com/delete-account' },
    footerNote: 'If you did not request this, please log in immediately, cancel the deletion, and change your password.',
  });
}

export interface AccountDeletionExecutedData {
  ownerName: string;
  ownerEmail: string;
}

export function renderAccountDeletionExecutedEmail(data: AccountDeletionExecutedData): string {
  return renderEmailLayout({
    preheader: 'Your Academyflo account and all associated data have been permanently deleted.',
    title: 'Your account has been deleted',
    greeting: `Dear ${data.ownerName},`,
    tone: 'info',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        As scheduled, your Academyflo account and every associated academy record have now been
        permanently deleted.
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">
        Thank you for using Academyflo. If you'd like to come back, you're always welcome to create a new account at
        <a href="https://academyflo.com" style="color:#0EA5E9;text-decoration:none;">academyflo.com</a>.
      </p>
    `,
    footerNote: 'Only retained: minimal audit logs and payment receipts we must keep for legal / tax compliance.',
  });
}

export interface AccountDeletionCancelledData {
  ownerName: string;
  academyName: string;
}

export function renderAccountDeletionCancelledEmail(data: AccountDeletionCancelledData): string {
  return renderEmailLayout({
    preheader: 'Your account deletion has been cancelled. Everything stays in place.',
    title: 'Account deletion cancelled',
    greeting: `Dear ${data.ownerName},`,
    tone: 'success',
    body: `
      <p style="margin:0;font-size:16px;line-height:24px;color:#0F172A;">
        Good news — the scheduled deletion for
        <strong>${escapeHtml(data.academyName)}</strong> has been cancelled. Your account and all data
        remain safe and accessible. There's nothing else you need to do.
      </p>
    `,
    cta: { label: 'Back to dashboard', url: 'https://academyflo.com/dashboard' },
  });
}
