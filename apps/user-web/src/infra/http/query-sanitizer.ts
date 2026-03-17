export function sanitizeQueryValue(value: string): string {
  let cleaned = value.replace(/\0/g, '');
  cleaned = cleaned.trim();
  while (cleaned.startsWith('$')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.trim();
}

export function buildSafeParams(
  entries: Record<string, string | number | boolean | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue;
    const strValue = typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : sanitizeQueryValue(value);
    if (strValue) params.set(key, strValue);
  }
  return params;
}
