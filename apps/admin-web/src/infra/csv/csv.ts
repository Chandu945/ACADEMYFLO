import 'server-only';

/**
 * Minimal RFC 4180-ish CSV encoder. Just enough for our admin exports.
 *
 * Quoting rules:
 * - Always wrap in double quotes (simpler than conditional quoting and
 *   handles every edge case the same way).
 * - Escape internal " by doubling it: "" — RFC 4180 standard.
 * - null / undefined render as empty fields.
 * - Dates → ISO strings; other objects → JSON.stringify.
 *
 * Newlines in values are preserved inside quoted fields, which Excel and
 * Google Sheets both parse correctly.
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '""';

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // CSV-injection prevention: prefix formula-leading characters with a single
  // quote so Excel doesn't interpret a cell starting with =, +, -, @, tab, or
  // CR as a formula. Critical when CSVs are opened in spreadsheets without
  // pre-import sanitization.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

/**
 * Build a complete CSV body from header row + data rows. Adds the BOM
 * so Excel auto-detects UTF-8 (otherwise non-ASCII names render as mojibake
 * when opened on Windows).
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const BOM = '﻿';
  const headerLine = csvRow(headers);
  const dataLines = rows.map(csvRow);
  return BOM + [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Wrap a CSV string into a Response with proper download headers.
 * Filename gets a date suffix so repeated exports don't overwrite.
 */
export function csvResponse(csv: string, filenameBase: string): Response {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenameBase}_${stamp}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
