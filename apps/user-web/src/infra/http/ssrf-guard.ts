export function assertSafeApiUrl(baseUrl: string, path: string): void {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with /: ${path}`);
  }
  if (path.startsWith('//')) {
    throw new Error(`API path must not start with //: ${path}`);
  }

  const decodedPath = decodeURIComponent(path);

  if (
    path.includes('/../') ||
    path.includes('/./') ||
    path.endsWith('/..') ||
    path.endsWith('/.') ||
    decodedPath.includes('/../') ||
    decodedPath.includes('/./') ||
    decodedPath.endsWith('/..') ||
    decodedPath.endsWith('/.')
  ) {
    throw new Error(`API path must not contain traversal sequences: ${path}`);
  }

  if (decodedPath.startsWith('//')) {
    throw new Error(`API path must not start with //: ${path}`);
  }

  const constructed = new URL(path, baseUrl);
  const base = new URL(baseUrl);
  if (constructed.origin !== base.origin) {
    throw new Error(`API URL origin mismatch: expected ${base.origin}, got ${constructed.origin}`);
  }
}
