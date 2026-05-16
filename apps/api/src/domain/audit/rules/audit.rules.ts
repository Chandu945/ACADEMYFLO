import type { UserRole } from '@academyflo/contracts';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// BUG-028: the previous regex /\+?\d[\d\s-]{7,}/ was matching any digit
// followed by 7+ digit/space/dash characters — which devoured ISO dates like
// "2026-05-15" and UUID fragments like "3-4963-902" inside context values,
// corrupting audit-log batchId and date fields and breaking existsForBatchDate.
// These two patterns mirror shared/utils/redact-pii.ts and only fire on
// genuine phone shapes:
//   - E.164: a literal '+' then 10–15 digits, anchored by \b at the end.
//   - Indian mobile: 10 digits with TRAI-allocated leading digit 6-9, fenced
//     by \b on both sides so they can't bleed into surrounding tokens.
const E164_PHONE_REGEX = /\+\d{10,15}\b/g;
const IN_MOBILE_REGEX = /\b[6-9]\d{9}\b/g;
const MAX_CONTEXT_KEYS = 10;
const MAX_VALUE_LENGTH = 120;

export function canViewAuditLogs(role: UserRole): boolean {
  return role === 'OWNER';
}

export function sanitizeContext(
  ctx: Record<string, string> | undefined | null,
): Record<string, string> | null {
  if (!ctx) return null;

  const keys = Object.keys(ctx).slice(0, MAX_CONTEXT_KEYS);
  const sanitized: Record<string, string> = {};

  for (const key of keys) {
    let value = String(ctx[key] ?? '').slice(0, MAX_VALUE_LENGTH);
    value = value.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
    value = value.replace(E164_PHONE_REGEX, '[REDACTED_PHONE]');
    value = value.replace(IN_MOBILE_REGEX, '[REDACTED_PHONE]');
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
