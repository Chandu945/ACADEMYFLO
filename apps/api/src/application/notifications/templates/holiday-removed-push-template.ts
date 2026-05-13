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
  // Reuses the same readable shape as the declare template ("May 14, 2026")
  // for consistency in the parent's notification tray.
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

export interface HolidayRemovedPush {
  title: string;
  body: string;
  data: {
    type: 'HOLIDAY_REMOVED';
    academyId: string;
    date: string;
  };
}

/**
 * Push sent to all parents when an owner removes a previously-declared
 * holiday (M4 attendance audit fix). Pairs with `holiday-declared-push-
 * template.ts` so the inverse action is communicated to parents who
 * already received the "closed" notice.
 *
 * Body wording is unambiguous about the correction — parents typically
 * already saw "X is closed on May 14" and need a clear signal that the
 * original message was retracted. We avoid alarming language ("error",
 * "cancelled") and frame it as a positive open-as-usual update.
 */
export function buildHolidayRemovedPush(params: {
  academyName: string;
  academyId: string;
  date: string;
}): HolidayRemovedPush {
  const formatted = formatHolidayDate(params.date);
  return {
    title: 'Holiday cancelled',
    body: `${params.academyName} will be open as usual on ${formatted}.`,
    data: {
      type: 'HOLIDAY_REMOVED',
      academyId: params.academyId,
      date: params.date,
    },
  };
}
