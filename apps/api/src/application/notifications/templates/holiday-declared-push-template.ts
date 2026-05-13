const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatHolidayDate(date: string): string {
  // Input: YYYY-MM-DD. Output: "Wed, May 14, 2026"-style readable string.
  const [year, mm, dd] = date.split('-');
  const yIdx = Number(year);
  const mIdx = Number(mm) - 1;
  const dIdx = Number(dd);
  if (
    !year ||
    Number.isNaN(yIdx) ||
    mIdx < 0 ||
    mIdx > 11 ||
    Number.isNaN(dIdx) ||
    dIdx < 1 ||
    dIdx > 31
  ) {
    return date;
  }
  return `${MONTH_NAMES[mIdx]} ${dIdx}, ${yIdx}`;
}

export interface HolidayDeclaredPush {
  title: string;
  body: string;
  data: {
    type: 'HOLIDAY_DECLARED';
    academyId: string;
    date: string;
    reason: string;
  };
}

/**
 * Push sent to all parents in the academy when the owner declares a holiday
 * (M3 fix). Replaces the silent void where the holiday existed in the DB but
 * parents had no idea — they'd show up to a closed academy.
 *
 * Body text deliberately uses present-tense "is closed" so the same template
 * works for today (backdated declaration), tomorrow, and future-planned
 * holidays without needing branching grammar.
 */
export function buildHolidayDeclaredPush(params: {
  academyName: string;
  academyId: string;
  date: string;
  reason: string | null;
}): HolidayDeclaredPush {
  const formatted = formatHolidayDate(params.date);
  const reasonSuffix = params.reason ? ` for ${params.reason}` : '';
  return {
    title: 'Holiday declared',
    body: `${params.academyName} is closed on ${formatted}${reasonSuffix}.`,
    data: {
      type: 'HOLIDAY_DECLARED',
      academyId: params.academyId,
      date: params.date,
      reason: params.reason ?? '',
    },
  };
}
