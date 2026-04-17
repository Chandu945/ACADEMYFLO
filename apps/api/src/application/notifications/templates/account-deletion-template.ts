function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface AccountDeletionRequestedData {
  ownerName: string;
  academyName: string;
  scheduledDate: string;
}

export function renderAccountDeletionRequestedEmail(data: AccountDeletionRequestedData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);
  const scheduledDate = escapeHtml(data.scheduledDate);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Account Deletion Scheduled</h2>
  <p>Dear ${ownerName},</p>
  <p>Your account deletion request for <strong>${academyName}</strong> has been received.</p>
  <p>Your account and all associated data will be permanently deleted on <strong>${scheduledDate}</strong>.</p>
  <p>You have a 30-day cooling-off period during which you can cancel this request by logging in and navigating to the Delete Account page.</p>
  <p><strong>After deletion, this action cannot be undone.</strong> All staff, students, attendance, fees, and expenses data will be permanently removed.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}

export interface AccountDeletionExecutedData {
  ownerName: string;
  ownerEmail: string;
}

export function renderAccountDeletionExecutedEmail(data: AccountDeletionExecutedData): string {
  const ownerName = escapeHtml(data.ownerName);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Account Permanently Deleted</h2>
  <p>Dear ${ownerName},</p>
  <p>Your Academyflo account and all associated academy data have been permanently deleted as scheduled.</p>
  <p>If you wish to use Academyflo in the future, you are welcome to create a new account.</p>
  <p>Thank you for using Academyflo.</p>
  <p>Best regards,<br>Academyflo Team</p>
</body></html>`;
}

export interface AccountDeletionCancelledData {
  ownerName: string;
  academyName: string;
}

export function renderAccountDeletionCancelledEmail(data: AccountDeletionCancelledData): string {
  const ownerName = escapeHtml(data.ownerName);
  const academyName = escapeHtml(data.academyName);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Account Deletion Cancelled</h2>
  <p>Dear ${ownerName},</p>
  <p>The scheduled account deletion for <strong>${academyName}</strong> has been cancelled.</p>
  <p>Your account and all data remain safe and accessible. No further action is needed.</p>
  <p>Thank you,<br>Academyflo Team</p>
</body></html>`;
}
