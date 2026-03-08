/**
 * SSRF guard for the BFF API client.
 *
 * Validates that the constructed URL still points to the expected API host.
 * Defence-in-depth: the path is always developer-controlled, but this guard
 * catches accidental misuse or future regressions.
 */

export function assertSafeApiUrl(baseUrl: string, path: string): void {
  // Path must start with /
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with /: ${path}`);
  }

  // Reject protocol-relative URLs (//evil.com)
  if (path.startsWith('//')) {
    throw new Error(`API path must not start with //: ${path}`);
  }

  // Reject path traversal
  if (
    path.includes('/../') ||
    path.includes('/./') ||
    path.endsWith('/..') ||
    path.endsWith('/.')
  ) {
    throw new Error(`API path must not contain traversal sequences: ${path}`);
  }

  // Final URL must share the same origin as the base URL
  const constructed = new URL(path, baseUrl);
  const base = new URL(baseUrl);

  if (constructed.origin !== base.origin) {
    throw new Error(`API URL origin mismatch: expected ${base.origin}, got ${constructed.origin}`);
  }
}
