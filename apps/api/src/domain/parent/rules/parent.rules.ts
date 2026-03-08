import type { UserRole } from '@playconnect/contracts';

export function canInviteParent(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can invite parents' };
  }
  return { allowed: true };
}

export function canViewOwnChildren(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'PARENT') {
    return { allowed: false, reason: 'Only parents can view their children' };
  }
  return { allowed: true };
}

export function canPayFeeOnline(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'PARENT') {
    return { allowed: false, reason: 'Only parents can pay fees online' };
  }
  return { allowed: true };
}

export function generateFeeOrderId(): string {
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 10);
  return `FEE_${dateStr}_${random}`;
}
