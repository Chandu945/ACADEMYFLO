import 'server-only';

import { redirect } from 'next/navigation';

import type { UserRole } from '@academyflo/contracts';
import { getSessionCookie } from '@/infra/auth/session-cookie';

/**
 * Server-component guard for role-restricted routes.
 *
 * Reads the encrypted session cookie, asserts the user's role is in the
 * allowed list, and redirects to /dashboard if not. Use in a `layout.tsx`
 * at the root of each role-restricted route tree so the redirect happens
 * before any page code runs.
 *
 * This exists in addition to the backend's `@Roles()` decorators (which are
 * the real security boundary). Here we redirect at the edge to avoid
 * rendering OWNER-only screens for STAFF/PARENT users, which would otherwise
 * produce a confusing "you don't have access" banner inside the app shell.
 */
export async function requireRole(allowed: UserRole[]): Promise<void> {
  const session = await getSessionCookie();
  if (!session) {
    redirect('/login');
  }
  if (!allowed.includes(session.role as UserRole)) {
    redirect('/dashboard');
  }
}
