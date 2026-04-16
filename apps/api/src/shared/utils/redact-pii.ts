/**
 * Redact personally-identifiable fragments from untrusted third-party error
 * strings before they land in logs or exception messages.
 *
 * This exists because upstream APIs (e.g. Cashfree) frequently echo request
 * values back in validation errors — customer_phone, customer_email, etc. —
 * and we don't want those leaking into log aggregators.
 *
 * The caller is responsible for choosing a reasonable `maxLen`. Default 200
 * chars is enough to preserve error-code + short description for debugging
 * without retaining long payloads.
 */

// Global flags are essential — a Cashfree error can mention multiple PII
// fragments (e.g. both phone and email) and we need to redact every one.
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// E.164-formatted phone: requires leading `+` so that pure-numeric order IDs
// or amounts are not accidentally matched.
const E164_PHONE_REGEX = /\+\d{10,15}\b/g;

// Indian mobile, 10 digits starting 6–9 (the only valid leading digits per
// TRAI allocation). Narrow enough that order IDs like `FEE_20240115_...` or
// 15-digit cf_payment_ids don't match, since word boundaries anchor it.
const IN_MOBILE_REGEX = /\b[6-9]\d{9}\b/g;

export function redactPII(text: string, maxLen = 200): string {
  let out = text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(E164_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(IN_MOBILE_REGEX, '[REDACTED_PHONE]');
  if (out.length > maxLen) {
    out = out.slice(0, maxLen) + '…';
  }
  return out;
}
