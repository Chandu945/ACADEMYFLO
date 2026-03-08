import type { UserRole } from '@playconnect/contracts';

export function canMarkStaffAttendance(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can mark staff attendance' };
  }
  return { allowed: true };
}

export function canViewStaffAttendance(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can view staff attendance' };
  }
  return { allowed: true };
}
