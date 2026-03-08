/**
 * Sanitizes user-provided notes/text fields:
 * - Strips HTML tags to prevent XSS in admin views
 * - Trims whitespace
 * - Enforces max length
 */

const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;

export function sanitizeNotes(value: string, maxLength = 500): string {
  const stripped = value.replace(HTML_TAG_RE, '');
  const trimmed = stripped.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}
