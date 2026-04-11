/**
 * Build a safe PDF filename for export.
 * Pattern: academyflo_<report>_<YYYY-MM>_<YYYYMMDD_HHmm>.pdf
 * No PII in filenames.
 */
export function buildPdfFilename(reportType: string, monthKey: string): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  const safeType = reportType.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safeMonth = monthKey.replace(/[^0-9-]/g, '');

  return `academyflo_${safeType}_${safeMonth}_${ts}.pdf`;
}

/**
 * Validate month key format (YYYY-MM).
 */
export function isValidMonthKey(monthKey: string): boolean {
  return /^\d{4}-\d{2}$/.test(monthKey);
}
