import type { UserRole } from '@academyflo/contracts';
import { getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';

/**
 * Domain rules for fee dues.
 * Pure functions — no framework dependencies.
 */

export function isEligibleForDue(
  joiningDate: Date,
  monthKey: string,
  isActive: boolean,
  isDeleted: boolean,
): boolean {
  if (!isActive || isDeleted) return false;

  // A student is eligible for a month's fee only if they joined STRICTLY
  // BEFORE that month — joining on any day of the target month skips it.
  // Their first fee is the next month's, generated on the 1st-of-month
  // cron run as UPCOMING and flipped to DUE on the academy's due date.
  //
  // This replaces the previous "joined after the 15th = skip" rule, which
  // surprised students who joined early in the month with an immediately-
  // overdue fee, and which used a hard-coded day independent of the
  // academy's configured `dueDateDay`. The new rule is one comparison and
  // gives every new joiner a clean "first month free, charged from next
  // month onward" experience that's easy to explain to parents.
  //
  // Compare on YYYY-MM strings (relies on TZ=Asia/Kolkata) — string compare
  // matches calendar order for zero-padded YYYY-MM values.
  const joinYear = joiningDate.getFullYear();
  const joinMonth = joiningDate.getMonth() + 1;
  const joiningMonthKey = `${joinYear}-${String(joinMonth).padStart(2, '0')}`;

  return joiningMonthKey < monthKey;
}

export function shouldFlipToDue(todayDay: number, dueDateDay: number): boolean {
  return todayDay >= dueDateDay;
}

export function computeDueDate(monthKey: string, dueDateDay: number): string {
  const daysInMonth = getDaysInMonth(monthKey);
  const clampedDay = Math.min(dueDateDay, daysInMonth);
  return `${monthKey}-${String(clampedDay).padStart(2, '0')}`;
}

export function canViewFees(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can view fees' };
  }
  return { allowed: true };
}

export function canMarkPaid(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can mark fees as paid' };
  }
  return { allowed: true };
}

export function canViewDashboard(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can view the dashboard' };
  }
  return { allowed: true };
}

export function canViewReports(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can view reports' };
  }
  return { allowed: true };
}
