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
