function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface OwnerWelcomeTemplateData {
  ownerName: string;
  email: string;
}

export function renderOwnerWelcomeEmail(data: OwnerWelcomeTemplateData): string {
  const ownerName = escapeHtml(data.ownerName);
  const email = escapeHtml(data.email);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <h2>Welcome to Academyflo!</h2>
  <p>Dear ${ownerName},</p>
  <p>Thank you for signing up on Academyflo. Your account has been created successfully.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:4px 12px;font-weight:bold;">Email</td><td style="padding:4px 12px;">${email}</td></tr>
  </table>
  <p><strong>Next steps:</strong></p>
  <ol>
    <li>Set up your academy (name, address, working days)</li>
    <li>Add your batches and staff members</li>
    <li>Start adding students and tracking attendance</li>
  </ol>
  <p>You have a <strong>30-day free trial</strong> to explore all features.</p>
  <p>Welcome aboard!<br>Academyflo Team</p>
</body></html>`;
}
