import type { UserRole } from '@playconnect/contracts';

/**
 * Domain rules for academy setup and settings.
 * Pure functions — no framework dependencies.
 */
export function canSetupAcademy(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can set up an academy' };
  }
  return { allowed: true };
}

export function validateDefaultDueDateDay(day: number): { valid: boolean; reason?: string } {
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { valid: false, reason: 'Due date day must be an integer between 1 and 28' };
  }
  return { valid: true };
}

export function validateReceiptPrefix(prefix: string): { valid: boolean; reason?: string } {
  if (prefix.length > 20) {
    return { valid: false, reason: 'Receipt prefix must be at most 20 characters' };
  }
  return { valid: true };
}

export function canViewSettings(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can view settings' };
  }
  return { allowed: true };
}

export function canUpdateSettings(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can update settings' };
  }
  return { allowed: true };
}
