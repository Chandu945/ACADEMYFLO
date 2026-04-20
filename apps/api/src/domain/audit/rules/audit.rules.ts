import type { UserRole } from '@academyflo/contracts';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /\+?\d[\d\s-]{7,}/;
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
    value = value.replace(PHONE_REGEX, '[REDACTED_PHONE]');
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
