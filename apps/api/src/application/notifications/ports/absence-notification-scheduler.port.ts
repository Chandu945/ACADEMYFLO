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
   *
   * KNOWN LIMITATION (L2 attendance audit — accepted as wontfix):
   * Idempotency holds ONLY while the original job is still in the queue.
   * Once the 1-hour delay fires and the job is removed, a subsequent
   * ABSENT → PRESENT → ABSENT toggle on the same day will schedule a fresh
   * job and the parent receives a second push. Triggers all of:
   *   1. First absence-mark fires its notification (1 hour after mark)
   *   2. Then a toggle to PRESENT
   *   3. Then a toggle back to ABSENT
   *   4. All on the same day
   * Rare in practice. If this becomes a real support burden, the fix is a
   * Redis dedup key written after successful send and checked at schedule
   * time — see the L2 entry in the attendance audit notes for the design.
   */
  schedule(mark: AbsenceMark): Promise<void>;

  /**
   * Remove any pending job for this key. No-op if none exists (e.g., the
   * original job already fired and was removed — see the toggle-after-fire
   * limitation documented on `schedule`). Failures are surfaced via thrown
   * errors — same caller treatment as `schedule`.
   */
  cancel(mark: AbsenceMark): Promise<void>;
}
