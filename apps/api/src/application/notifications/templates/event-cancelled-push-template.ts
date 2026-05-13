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

function formatEventDate(date: Date): string {
  // Reuses the same readable shape as the holiday template ("May 14, 2026")
  // for cross-notification visual consistency in the parent's notification
  // tray.
  const mIdx = date.getMonth();
  const dIdx = date.getDate();
  const yIdx = date.getFullYear();
  if (mIdx < 0 || mIdx > 11) return date.toISOString().slice(0, 10);
  return `${MONTH_NAMES[mIdx]} ${dIdx}, ${yIdx}`;
}

export interface EventCancelledPush {
  title: string;
  body: string;
  data: {
    type: 'EVENT_CANCELLED';
    academyId: string;
    eventId: string;
    startDate: string;
  };
}

/**
 * Push sent to all parents in the academy when an event is cancelled
 * (M2 fix). The use case currently broadcasts to every linked parent in
 * the academy rather than filtering by event.batchIds — simpler and avoids
 * a parent missing news because the audience filter mis-fired. We can
 * narrow later if signal-to-noise becomes a problem.
 *
 * Past-dated events get cancelled too (e.g., owner cleans up records);
 * the body text reads naturally for both upcoming and past events
 * ("Event 'Annual Day' on May 14, 2026 has been cancelled.").
 */
export function buildEventCancelledPush(params: {
  academyId: string;
  eventId: string;
  eventTitle: string;
  eventStartDate: Date;
}): EventCancelledPush {
  const formatted = formatEventDate(params.eventStartDate);
  return {
    title: 'Event cancelled',
    body: `${params.eventTitle} on ${formatted} has been cancelled.`,
    data: {
      type: 'EVENT_CANCELLED',
      academyId: params.academyId,
      eventId: params.eventId,
      startDate: params.eventStartDate.toISOString().slice(0, 10),
    },
  };
}
