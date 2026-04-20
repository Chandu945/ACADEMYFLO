const COOKIE_NAME = 'af_user_csrf';

export function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export function csrfHeaders(base: Record<string, string> = {}): Record<string, string> {
  const token = readCsrfCookie();
  if (!token) return base;
  return { ...base, 'X-CSRF-Token': token };
}
