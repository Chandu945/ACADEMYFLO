/**
 * Shared email layout primitives.
 *
 * All transactional emails Academyflo sends should go through `renderEmailLayout`
 * so branding, spacing, and dark-mode hints stay consistent across the product.
 *
 * Constraints enforced here:
 *   - Table-based layout (Outlook + many clients strip flexbox/grid/divs-as-layout).
 *   - Inline styles only (most clients strip <style>/<link>).
 *   - Max-width 600px card on a tinted page background (industry standard for tx).
 *   - All dynamic strings must be escaped by the caller via `escapeHtml`.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatInr(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

export type EmailTone = 'info' | 'success' | 'warning' | 'danger';

export interface EmailCta {
  label: string;
  url: string;
}

export interface EmailInfoRow {
  label: string;
  value: string;
  /** If true, render the value in monospace (for codes/IDs/passwords) */
  mono?: boolean;
}

export interface EmailLayoutInput {
  /** Hidden preview text shown in inbox lists before the email is opened (60–90 chars). Escaped for you. */
  preheader: string;
  /** Plain-text title for the hero section. Escaped for you. */
  title: string;
  /** Optional greeting line, e.g. "Hi Priya,". Escaped for you. */
  greeting?: string;
  /** Main body HTML. Caller IS responsible for escaping all dynamic values inserted into `body`. */
  body: string;
  /** Optional labeled rows shown in a bordered info card. `value` should be escaped by the caller if dynamic. */
  infoRows?: EmailInfoRow[];
  /** Optional primary call-to-action button. `label` is escaped; `url` is inserted as-is — pass a trusted URL. */
  cta?: EmailCta;
  /** Tone drives the accent bar and CTA button colour. */
  tone?: EmailTone;
  /** Extra muted paragraph rendered above the footer (e.g. "If this wasn't you…"). Escaped for you. */
  footerNote?: string;
}

const TONE_ACCENT: Record<EmailTone, string> = {
  info: '#0EA5E9',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
};

const BRAND_NAME = 'Academyflo';
const BRAND_DOMAIN = 'academyflo.com';
const SUPPORT_EMAIL = 'support@academyflo.com';

export function renderEmailLayout(input: EmailLayoutInput): string {
  const accent = TONE_ACCENT[input.tone ?? 'info'];
  // Fields rendered as text — escape here so callers can't accidentally leak
  // unescaped user input through preheader / title / greeting / footer paths.
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const greeting = input.greeting ? escapeHtml(input.greeting) : undefined;
  const footerNote = input.footerNote ? escapeHtml(input.footerNote) : undefined;

  const infoTable = input.infoRows?.length ? renderInfoTable(input.infoRows) : '';
  const ctaBlock = input.cta ? renderCta(input.cta, accent) : '';
  const greetingBlock = greeting
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0F172A;">${greeting}</p>`
    : '';
  const footerNoteBlock = footerNote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#64748B;">${footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Helvetica,Arial,sans-serif;">
  <!-- Preheader (hidden, shown in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F1F5F9;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

          <!-- Accent bar -->
          <tr>
            <td style="background-color:${accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Brand header -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <span style="display:inline-block;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.01em;">${BRAND_NAME}</span>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:8px 32px 4px;">
              <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:600;color:#0F172A;letter-spacing:-0.01em;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 32px 8px;color:#0F172A;font-size:16px;line-height:24px;">
              ${greetingBlock}
              ${input.body}
              ${infoTable}
              ${ctaBlock}
              ${footerNoteBlock}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #E2E8F0;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 28px;font-size:12px;line-height:18px;color:#94A3B8;">
              <p style="margin:0 0 4px;">
                <strong style="color:#64748B;">${BRAND_NAME}</strong> &middot;
                <a href="https://${BRAND_DOMAIN}" style="color:#64748B;text-decoration:none;">${BRAND_DOMAIN}</a>
              </p>
              <p style="margin:0;">
                Questions? Reach us at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#64748B;text-decoration:underline;">${SUPPORT_EMAIL}</a>.
                This is a transactional message sent because of activity on your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderInfoTable(rows: EmailInfoRow[]): string {
  const body = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      const value = r.mono
        ? `<span style="font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:14px;background-color:#E2E8F0;padding:3px 8px;border-radius:4px;color:#0F172A;">${r.value}</span>`
        : r.value;
      return `
      <tr>
        <td style="padding:10px 16px;background-color:${bg};font-size:13px;font-weight:600;color:#64748B;letter-spacing:0.02em;text-transform:uppercase;width:40%;vertical-align:middle;">${r.label}</td>
        <td style="padding:10px 16px;background-color:${bg};font-size:15px;color:#0F172A;vertical-align:middle;">${value}</td>
      </tr>`;
    })
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;border:1px solid #E2E8F0;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
    ${body}
  </table>`;
}

function renderCta(cta: EmailCta, accent: string): string {
  // Bulletproof button pattern: table+td for Outlook, rounded link inside.
  const label = escapeHtml(cta.label);
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;">
    <tr>
      <td align="center" bgcolor="${accent}" style="border-radius:6px;">
        <a href="${cta.url}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#FFFFFF;background-color:${accent};border-radius:6px;text-decoration:none;mso-padding-alt:0;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}
