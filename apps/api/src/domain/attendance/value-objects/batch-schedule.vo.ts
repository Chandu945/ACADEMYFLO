import type { Weekday } from '@academyflo/contracts';
import { getAllDatesInMonth } from './local-date.vo';

const JS_WEEKDAY_TO_LABEL: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Dates in a month where a batch is scheduled to meet, excluding holidays.
 * Used to compute "expected sessions" for attendance percentage math.
 */
export function scheduledDatesInMonth(
  monthKey: string,
  batchDays: readonly Weekday[],
  holidayDates: readonly string[],
): string[] {
  if (batchDays.length === 0) return [];
  const allowed = new Set(batchDays);
  const holidaySet = new Set(holidayDates);
  return getAllDatesInMonth(monthKey).filter((dateStr) => {
    if (holidaySet.has(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const jsWeekday = new Date(y!, m! - 1, d!).getDay(); // 0=Sun..6=Sat
    const label = JS_WEEKDAY_TO_LABEL[jsWeekday]!;
    return allowed.has(label);
  });
}
