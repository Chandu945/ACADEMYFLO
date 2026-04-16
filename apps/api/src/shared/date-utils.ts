/**
 * Date utilities that rely on TZ=Asia/Kolkata being set.
 */

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
