/**
 * Sanitize individual query values before they are passed to the backend.
 * Strips MongoDB operator prefixes ($) and null bytes to prevent
 * NoSQL injection through query parameters.
 */

export function sanitizeQueryValue(value: string): string {
  // Remove null bytes
  let cleaned = value.replace(/\0/g, '');

  // Trim whitespace first so embedded $ is caught
  cleaned = cleaned.trim();

  // Strip leading $ to prevent MongoDB operator injection
  while (cleaned.startsWith('$')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned.trim();
}

/**
 * Builds a safe URLSearchParams from a record, sanitizing all string values.
 */
export function buildSafeParams(
  entries: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue;
    const strValue = typeof value === 'number' ? String(value) : sanitizeQueryValue(value);
    if (strValue) params.set(key, strValue);
  }
  return params;
}
