import type { UserRole } from '@playconnect/contracts';
import type { User } from '../entities/user.entity';

export function canManageStaff(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can manage staff' };
  }
  return { allowed: true };
}

export function staffBelongsToAcademy(
  staff: User,
  ownerAcademyId: string,
): { allowed: boolean; reason?: string } {
  if (staff.academyId !== ownerAcademyId) {
    return { allowed: false, reason: 'Staff does not belong to your academy' };
  }
  return { allowed: true };
}
