import type { User } from '../entities/user.entity';

/**
 * Domain rules for authentication.
 * Pure functions — no framework dependencies.
 */
export function canLogin(user: User): { allowed: boolean; reason?: string } {
  if (user.role === 'STAFF' && !user.isActive()) {
    return { allowed: false, reason: 'Inactive staff cannot login' };
  }
  if (!user.isActive()) {
    return { allowed: false, reason: 'User account is inactive' };
  }
  return { allowed: true };
}
