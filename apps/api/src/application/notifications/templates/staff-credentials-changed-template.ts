/**
 * M2 (staff audit): emailed to a staff member when the owner changes their
 * login credentials (email / phone / password). Sent to BOTH the old and the
 * new email when email is the field that changed, so the staff sees the
 * notice regardless of which address they check.
 *
 * Body wording matches the staff-deactivated template's tone — informative,
 * not alarming. The expectation is that legitimate credential rotation is
 * communicated to the staff out of band (verbally) and the email is a
 * paper trail. If credential rotation happens without warning, this email
 * is the staff's signal to call the owner immediately.
 */
export function renderStaffCredentialsChangedEmail(params: {
  staffName: string;
  academyName: string;
  changedFields: ReadonlyArray<'email' | 'phone' | 'password'>;
  newEmail: string | null;
  newPhone: string | null;
}): string {
  const friendly = params.changedFields
    .map((f) => {
      if (f === 'email') return 'email address';
      if (f === 'phone') return 'phone number';
      return 'password';
    })
    .join(', ');

  const credentialBlock: string[] = [];
  if (params.changedFields.includes('email') && params.newEmail) {
    credentialBlock.push(`<li><b>New email:</b> ${params.newEmail}</li>`);
  }
  if (params.changedFields.includes('phone') && params.newPhone) {
    credentialBlock.push(`<li><b>New phone:</b> ${params.newPhone}</li>`);
  }
  const credentialList = credentialBlock.length
    ? `<ul style="margin: 8px 0 16px 20px;">${credentialBlock.join('')}</ul>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px;">
      <p>Hi ${escapeHtml(params.staffName)},</p>
      <p>Your <b>${escapeHtml(friendly)}</b> for <b>${escapeHtml(params.academyName)}</b> was updated by the academy owner.</p>
      ${credentialList}
      <p>If you didn't request this change, contact the academy owner immediately. Your active sessions have been signed out as a security precaution.</p>
      <p style="color: #6b7280; font-size: 12px;">This is an automated notification.</p>
    </div>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
