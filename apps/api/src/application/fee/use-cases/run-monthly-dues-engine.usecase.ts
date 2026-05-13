import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { isEligibleForDue, shouldFlipToDue, computeDueDate } from '@domain/fee/rules/fee.rules';
import {
  toMonthKeyFromDate,
  formatLocalDate,
  daysBetweenLocalDates,
  getPreviousMonthKey,
} from '@shared/date-utils';
import { DEFAULT_DUE_DATE_DAY } from '@academyflo/contracts';
import { buildLateFeeConfigFromAcademy } from '../common/late-fee';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { randomUUID } from 'crypto';

export interface RunMonthlyDuesEngineInput {
  academyId: string;
  now: Date;
}

export interface RunMonthlyDuesEngineOutput {
  created: number;
  flippedToDue: number;
  snapshotted: number;
  /**
   * Count of records created retroactively for the previous month — non-zero
   * only when the cron skipped the previous month boundary (M2 safety net).
   * A persistent non-zero value should trigger an ops alert.
   */
  backfilled: number;
}

export class RunMonthlyDuesEngineUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    /**
     * Records MONTHLY_DUES_ENGINE_RAN in the audit log so owners can answer
     * "did the dues engine run for academy X on Aug 1, and what did it do?"
     * from the audit feed alone (M3 fee/payments audit fix). Optional so
     * legacy fixtures keep working — without it, the engine still runs and
     * its counts are returned, just no audit entry. Production wiring
     * always passes it.
     *
     * actorUserId on the entry is 'SYSTEM' (the cron has no user actor).
     * Sanitization at the audit-recorder allows this sentinel.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(
    input: RunMonthlyDuesEngineInput,
  ): Promise<Result<RunMonthlyDuesEngineOutput, AppError>> {
    const academy = await this.academyRepo.findById(input.academyId);
    if (!academy) {
      return ok({ created: 0, flippedToDue: 0, snapshotted: 0, backfilled: 0 });
    }

    const dueDateDay = academy.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY;
    const monthKey = toMonthKeyFromDate(input.now);
    const todayDay = input.now.getDate();

    const students = await this.studentRepo.listActiveByAcademy(input.academyId);

    // Batch-fetch all existing dues for this academy+month to avoid N+1 queries
    const existingDues = await this.feeDueRepo.listByAcademyAndMonth(input.academyId, monthKey);
    const existingStudentIds = new Set(existingDues.map((d) => d.studentId));

    const toCreate: FeeDue[] = [];
    for (const student of students) {
      if (
        !isEligibleForDue(
          student.joiningDate,
          monthKey,
          student.status === 'ACTIVE',
          student.isDeleted(),
        )
      ) {
        continue;
      }

      if (existingStudentIds.has(student.id.toString())) continue;

      const dueDate = computeDueDate(monthKey, dueDateDay);
      toCreate.push(
        FeeDue.create({
          id: randomUUID(),
          academyId: input.academyId,
          studentId: student.id.toString(),
          monthKey,
          dueDate,
          amount: student.monthlyFee,
        }),
      );
    }

    if (toCreate.length > 0) {
      await this.feeDueRepo.bulkSave(toCreate);
    }

    // Build the late-fee config once per run — used both at flip time
    // (primary path) and by the legacy-backfill scan below.
    const config = buildLateFeeConfigFromAcademy(academy);
    const lateFeeActive = !!config && academy.lateFeeAmountInr > 0;

    let flippedToDue = 0;
    let snapshotted = 0;

    if (shouldFlipToDue(todayDay, dueDateDay)) {
      const upcoming = await this.feeDueRepo.listUpcomingByAcademyAndMonth(
        input.academyId,
        monthKey,
      );
      if (upcoming.length > 0) {
        const ids = upcoming.map((u) => u.id.toString());
        await this.feeDueRepo.bulkUpdateStatus(ids, 'DUE', 'UPCOMING');
        flippedToDue = upcoming.length;

        // M1 fix: snapshot the late-fee config at FLIP time, not at
        // grace-end time. This locks the rate to "what was live when the
        // fee became DUE", so a config change after dueDateDay can't
        // retroactively re-price already-flipped fees. Race-safe via the
        // conditional update — if a fee was marked PAID between the flip
        // and the snapshot, the per-fee updateOne no-ops.
        if (lateFeeActive && config) {
          for (const due of upcoming) {
            const applied = await this.feeDueRepo.saveSnapshotIfStillDue(due.id.toString(), config);
            if (applied) snapshotted++;
          }
        }
      }
    }

    // M2 fix: Previous-month backfill. If the cron was down across the
    // previous month's boundary, no records were created for that month.
    // By the time it runs again, `monthKey` points at the current month
    // and the gap would be silent — students get a free month and the
    // academy owner loses billable dues with no error to surface it.
    //
    // Look back exactly one month and create any missing record for an
    // eligible student. The dueDate is always in the past at this point
    // (we're already in the next month), so we create directly in DUE
    // status rather than going through UPCOMING + flip. If late fee is
    // active and we're past the previous month's grace period, snapshot
    // at creation — same flip-time-snapshot semantics as M1.
    //
    // Limitation: a student who became inactive between the previous
    // month and now won't be backfilled, because they no longer appear
    // in `listActiveByAcademy`. This is consistent with the existing
    // engine behavior (it never creates dues for inactive students)
    // and avoids the messier question of "when exactly did they leave
    // and should they have been billed for that gap".
    const previousMonthKey = getPreviousMonthKey(monthKey);
    const existingPrevDues = await this.feeDueRepo.listByAcademyAndMonth(
      input.academyId,
      previousMonthKey,
    );
    const existingPrevStudentIds = new Set(existingPrevDues.map((d) => d.studentId));

    const previousMonthDueDate = computeDueDate(previousMonthKey, dueDateDay);
    const todayStr = formatLocalDate(input.now);
    const previousMonthDaysPastDue = daysBetweenLocalDates(previousMonthDueDate, todayStr);
    const shouldSnapshotPreviousMonth =
      lateFeeActive && !!config && previousMonthDaysPastDue > config.gracePeriodDays;

    const toBackfill: FeeDue[] = [];
    for (const student of students) {
      if (
        !isEligibleForDue(
          student.joiningDate,
          previousMonthKey,
          student.status === 'ACTIVE',
          student.isDeleted(),
        )
      ) {
        continue;
      }
      if (existingPrevStudentIds.has(student.id.toString())) continue;

      let due = FeeDue.create({
        id: randomUUID(),
        academyId: input.academyId,
        studentId: student.id.toString(),
        monthKey: previousMonthKey,
        dueDate: previousMonthDueDate,
        amount: student.monthlyFee,
      }).flipToDue();

      if (shouldSnapshotPreviousMonth && config) {
        due = due.snapshotLateFeeConfig(config);
        snapshotted++;
      }

      toBackfill.push(due);
    }

    if (toBackfill.length > 0) {
      await this.feeDueRepo.bulkSave(toBackfill);
    }

    // Legacy / safety-net backfill: snapshot any DUE record that's missed
    // the flip-time snapshot. Covers three real cases:
    //   1. Records that flipped before this M1 fix shipped (no snapshot
    //      yet — pre-fix behavior left them un-snapshotted).
    //   2. Owner enabled late fee MID-CYCLE — the fees flipped earlier
    //      with no late-fee config in scope, so they entered DUE without
    //      a snapshot. Now that the policy is on, snapshot them once they
    //      cross grace.
    //   3. M2-backfilled records that landed within an unusually long
    //      grace period (rare — grace must be > monthDelta + a few days).
    //      They'll be picked up here on a future run once past grace.
    // Still race-safe via saveSnapshotIfStillDue, and still bounded to
    // "past grace" so we don't accidentally snapshot fees still in their
    // grace window.
    if (lateFeeActive && config) {
      const unsnapshotted = await this.feeDueRepo.findDueWithoutSnapshot(input.academyId);
      for (const due of unsnapshotted) {
        const daysPastDue = daysBetweenLocalDates(due.dueDate, todayStr);
        if (daysPastDue > config.gracePeriodDays) {
          const applied = await this.feeDueRepo.saveSnapshotIfStillDue(due.id.toString(), config);
          if (applied) snapshotted++;
        }
      }
    }

    const summary = {
      created: toCreate.length,
      flippedToDue,
      snapshotted,
      backfilled: toBackfill.length,
    };

    // M3 fix (fee/payments audit): record the run in the audit log with its
    // outcome counters. Without this the engine was silent — forensic
    // questions like "did June 2025 dues get created?" required reading
    // infrastructure logs that may have already rolled off. We only audit
    // when something actually changed (any non-zero counter) so a no-op
    // cron run on a quiet day doesn't pollute the feed.
    const anyChange =
      summary.created > 0 ||
      summary.flippedToDue > 0 ||
      summary.snapshotted > 0 ||
      summary.backfilled > 0;
    if (this.auditRecorder && anyChange) {
      await this.auditRecorder.record({
        academyId: input.academyId,
        actorUserId: 'SYSTEM',
        action: 'MONTHLY_DUES_ENGINE_RAN',
        entityType: 'FEE_DUE',
        entityId: monthKey,
        context: {
          monthKey,
          created: String(summary.created),
          flippedToDue: String(summary.flippedToDue),
          snapshotted: String(summary.snapshotted),
          backfilled: String(summary.backfilled),
        },
      });
    }

    return ok(summary);
  }
}
