const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
}

export function isValidMonthKey(value: string): boolean {
  if (!MONTH_KEY_REGEX.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return year! >= 1900 && year! <= 2100 && month! >= 1 && month! <= 12;
}

export function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year!, month!, 0).getDate();
}

export function getAllDatesInMonth(monthKey: string): string[] {
  const days = getDaysInMonth(monthKey);
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    dates.push(`${monthKey}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/** Today's date as YYYY-MM-DD in IST. The academy operates in Asia/Kolkata
 *  regardless of where the API process runs. */
export function getTodayLocalDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Number of elapsed calendar days in `monthKey` as of today (IST).
 *  Past months: full month. Current month: 1..today's day-of-month.
 *  Future months: 0. Used to avoid counting future days as absences. */
export function daysElapsedInMonth(monthKey: string): number {
  const today = getTodayLocalDate();
  const todayMonth = today.slice(0, 7);
  if (monthKey < todayMonth) return getDaysInMonth(monthKey);
  if (monthKey > todayMonth) return 0;
  return Number(today.slice(8, 10));
}
