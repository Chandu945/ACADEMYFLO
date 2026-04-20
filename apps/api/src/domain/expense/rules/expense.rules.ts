import type { UserRole } from '@academyflo/contracts';

export function canManageExpenses(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can manage expenses' };
  }
  return { allowed: true };
}
