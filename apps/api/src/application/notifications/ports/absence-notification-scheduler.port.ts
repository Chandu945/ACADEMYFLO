export const ABSENCE_NOTIFICATION_SCHEDULER_PORT = Symbol('ABSENCE_NOTIFICATION_SCHEDULER_PORT');

/**
 * Identity of a single (student, batch, date) absence event.
 *
 * Used as the stable jobId in BullMQ so that:
 *   - Re-enqueueing for the same key is a no-op (first-wins semantics) — a
 *     coach tapping ABSENT twice doesn't extend the timer.
 *   - Cancel by exact key is reliable when the coach toggles back to PRESENT.
 */
export interface AbsenceMark {
  academyId: string;
  studentId: string;
  batchId: string;
  /** YYYY-MM-DD in IST. */
  date: string;
}

export interface AbsenceNotificationSchedulerPort {
  /**
   * Schedule a delayed push for this absence. Idempotent on the (academyId,
   * studentId, batchId, date) tuple — re-scheduling the same key is a no-op
   * while the original job is still pending. Failures are surfaced via
   * thrown errors; callers wrap in try/catch so a scheduling outage never
   * fails the underlying attendance write.
   */
  schedule(mark: AbsenceMark): Promise<void>;

  /**
   * Remove any pending job for this key. No-op if none exists. Failures are
   * surfaced via thrown errors — same caller treatment as `schedule`.
   */
  cancel(mark: AbsenceMark): Promise<void>;
}
