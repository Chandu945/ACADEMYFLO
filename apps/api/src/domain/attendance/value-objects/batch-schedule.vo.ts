import type { Weekday } from '@academyflo/contracts';
import { getAllDatesInMonth } from './local-date.vo';

const JS_WEEKDAY_TO_LABEL: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Dates in a month where a batch is scheduled to meet, excluding holidays.
 * Used to compute "expected sessions" for attendance percentage math.
 *
 * `upToDate` (YYYY-MM-DD) caps the result to dates <= that day. Pass today's
 * IST date when computing absences for the current month so that future
 * scheduled days aren't counted as missed.
 */
export function scheduledDatesInMonth(
  monthKey: string,
  batchDays: readonly Weekday[],
  holidayDates: readonly string[],
  upToDate?: string,
): string[] {
  if (batchDays.length === 0) return [];
  const allowed = new Set(batchDays);
  const holidaySet = new Set(holidayDates);
  return getAllDatesInMonth(monthKey).filter((dateStr) => {
    if (upToDate && dateStr > upToDate) return false;
    if (holidaySet.has(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const jsWeekday = new Date(y!, m! - 1, d!).getDay(); // 0=Sun..6=Sat
    const label = JS_WEEKDAY_TO_LABEL[jsWeekday]!;
    return allowed.has(label);
  });
}
