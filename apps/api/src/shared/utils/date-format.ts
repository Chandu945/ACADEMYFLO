/**
 * Returns the IST (Asia/Kolkata) calendar date for a Date as `YYYY-MM-DD`.
 *
 * Use this when the displayed date MUST be what an Indian user sees on their
 * calendar — e.g. email body text, SMS, report titles. The common mistake is
 * `date.toISOString().split('T')[0]`, which yields the UTC calendar date and
 * is off by a day for any instant between 18:30 UTC and 23:59 UTC (which is
 * after midnight IST).
 */
export function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
