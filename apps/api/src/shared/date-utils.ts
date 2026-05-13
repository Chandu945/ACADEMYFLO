/**
 * Date utilities that rely on TZ=Asia/Kolkata being set.
 */

import type { Weekday } from '@academyflo/contracts';

// Maps JS Date#getDay() (0=Sun..6=Sat) to the Weekday labels used by batch
// schedules. Re-exported here so repositories and use-cases can derive the
// weekday of a YYYY-MM-DD string without depending on the batch-schedule VO.
const JS_WEEKDAY_TO_LABEL: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Returns the Weekday label ('MON', 'TUE', ...) for a YYYY-MM-DD string.
 * Uses Date constructor in local time — pair with TZ=Asia/Kolkata so the
 * weekday reflects the IST calendar (a session at 11pm IST on Tuesday must
 * not be reported as Wednesday).
 */
export function weekdayLabelFromDate(localDate: string): Weekday {
  const parts = localDate.split('-').map(Number) as [number, number, number];
  const jsWeekday = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  return JS_WEEKDAY_TO_LABEL[jsWeekday]!;
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toMonthKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const parts = localDate.split('-').map(Number) as [number, number, number];
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/**
 * Days between two YYYY-MM-DD strings. Interprets both as UTC midnight so the
 * result is independent of the server's TZ setting (both strings represent
 * calendar dates, not wall-clock instants).
 */
export function daysBetweenLocalDates(fromYmd: string, toYmd: string): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const fromMs = Date.UTC(
    Number(fromYmd.slice(0, 4)),
    Number(fromYmd.slice(5, 7)) - 1,
    Number(fromYmd.slice(8, 10)),
  );
  const toMs = Date.UTC(
    Number(toYmd.slice(0, 4)),
    Number(toYmd.slice(5, 7)) - 1,
    Number(toYmd.slice(8, 10)),
  );
  return Math.floor((toMs - fromMs) / DAY_MS);
}
