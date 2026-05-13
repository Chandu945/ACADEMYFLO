import type { UserRole } from '@academyflo/contracts';
import { STUDENT_ATTENDANCE_STATUSES } from '@academyflo/contracts';
import { isValidLocalDate, isValidMonthKey } from '../value-objects/local-date.vo';
import { formatLocalDate } from '@shared/date-utils';

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
  if (!(STUDENT_ATTENDANCE_STATUSES as readonly string[]).includes(status)) {
    return {
      valid: false,
      reason: `Status must be one of: ${STUDENT_ATTENDANCE_STATUSES.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Ensure date is not in the future and not more than 30 days in the past (IST).
 * Uses formatLocalDate for IST-aware date comparison (TZ=Asia/Kolkata).
 *
 * `now` defaults to the current system time but accepts an injected clock
 * for deterministic testing (L5 attendance audit fix). Production call sites
 * don't need to pass it.
 */
export function validateDateRange(
  value: string,
  now: Date = new Date(),
): { valid: boolean; reason?: string } {
  const todayStr = formatLocalDate(now);

  if (value > todayStr) {
    return { valid: false, reason: 'Date cannot be in the future' };
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo);

  if (value < thirtyDaysAgoStr) {
    return { valid: false, reason: 'Date cannot be more than 30 days in the past' };
  }

  return { valid: true };
}

export function validateHolidayReason(reason: string): { valid: boolean; reason?: string } {
  if (reason.length > 200) {
    return { valid: false, reason: 'Holiday reason must not exceed 200 characters' };
  }
  return { valid: true };
}

/**
 * Holiday-specific date range (M2 + L6 fix). Looser than `validateDateRange`
 * because holidays need to be planned ahead — but still bounded to catch
 * obvious typos like `2046-01-26` (year fat-finger) or `1900-01-01` (default
 * date picker value).
 *
 *   - Past: up to 30 days back (matches the attendance edit window so a
 *     forgotten holiday can be backdated to align with already-marked dates)
 *   - Future: up to 2 years ahead (enough to plan a full annual calendar
 *     while still rejecting century-scale overshoots)
 *
 * `now` defaults to the current system time but accepts an injected clock
 * for deterministic testing (L5 attendance audit fix).
 */
export function validateHolidayDateRange(
  value: string,
  now: Date = new Date(),
): { valid: boolean; reason?: string } {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo);

  if (value < thirtyDaysAgoStr) {
    return { valid: false, reason: 'Holiday date cannot be more than 30 days in the past' };
  }

  const twoYearsAhead = new Date(now);
  twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);
  const twoYearsAheadStr = formatLocalDate(twoYearsAhead);

  if (value > twoYearsAheadStr) {
    return { valid: false, reason: 'Holiday date cannot be more than 2 years in the future' };
  }

  return { valid: true };
}
