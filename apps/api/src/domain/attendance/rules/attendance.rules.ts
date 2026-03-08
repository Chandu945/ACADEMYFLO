import type { UserRole } from '@playconnect/contracts';
import { isValidLocalDate, isValidMonthKey } from '../value-objects/local-date.vo';

export function canMarkAttendance(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can mark attendance' };
  }
  return { allowed: true };
}

export function canDeclareHoliday(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can declare holidays' };
  }
  return { allowed: true };
}

export function canViewAttendance(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can view attendance' };
  }
  return { allowed: true };
}

export function validateLocalDate(value: string): { valid: boolean; reason?: string } {
  if (!isValidLocalDate(value)) {
    return { valid: false, reason: 'Date must be a valid YYYY-MM-DD format' };
  }
  return { valid: true };
}

export function validateMonthKey(value: string): { valid: boolean; reason?: string } {
  if (!isValidMonthKey(value)) {
    return { valid: false, reason: 'Month must be a valid YYYY-MM format' };
  }
  return { valid: true };
}

export function validateAttendanceStatus(status: string): { valid: boolean; reason?: string } {
  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return { valid: false, reason: 'Status must be PRESENT or ABSENT' };
  }
  return { valid: true };
}

export function validateHolidayReason(reason: string): { valid: boolean; reason?: string } {
  if (reason.length > 200) {
    return { valid: false, reason: 'Holiday reason must not exceed 200 characters' };
  }
  return { valid: true };
}
