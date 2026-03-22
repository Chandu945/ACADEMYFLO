const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-03" → "March 2026" */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const idx = parseInt(month ?? '0', 10) - 1;
  return `${MONTH_NAMES[idx] ?? month} ${year}`;
}

/** "2026-03" → "Mar 2026" */
export function formatMonthShort(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const idx = parseInt(month ?? '0', 10) - 1;
  return `${MONTH_SHORT[idx] ?? month} ${year}`;
}

/** Format currency in INR */
export function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

/** Get initials from name — "John Doe" → "JD" */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Format date for display — "2026-03-10T..." → "10 Mar 2026" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format date long — "2026-03-10T..." → "10 March 2026" */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Add days to a YYYY-MM-DD date string */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Add months to a YYYY-MM month string */
export function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

/** Normalize phone number — add +91 prefix for bare 10-digit numbers */
export function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-()]/g, '');
  // Bare 10-digit number → assume India (+91)
  if (/^\d{10}$/.test(stripped)) return `+91${stripped}`;
  // Already has + prefix → return as-is
  if (stripped.startsWith('+')) return stripped;
  // Country code without + (e.g. "919876543210") → prepend +
  if (/^[1-9]\d{7,14}$/.test(stripped) && stripped.length > 10) return `+${stripped}`;
  return stripped;
}
