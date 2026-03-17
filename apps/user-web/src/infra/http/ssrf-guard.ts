export function assertSafeApiUrl(baseUrl: string, path: string): void {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with /: ${path}`);
  }
  if (path.startsWith('//')) {
    throw new Error(`API path must not start with //: ${path}`);
  }
  if (
    path.includes('/../') ||
    path.includes('/./') ||
    path.endsWith('/..') ||
    path.endsWith('/.')
  ) {
    throw new Error(`API path must not contain traversal sequences: ${path}`);
  }
  const constructed = new URL(path, baseUrl);
  const base = new URL(baseUrl);
  if (constructed.origin !== base.origin) {
    throw new Error(`API URL origin mismatch: expected ${base.origin}, got ${constructed.origin}`);
  }
}
