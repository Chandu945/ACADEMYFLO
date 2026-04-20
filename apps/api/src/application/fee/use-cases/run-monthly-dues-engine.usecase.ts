import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { isEligibleForDue, shouldFlipToDue, computeDueDate } from '@domain/fee/rules/fee.rules';
import { toMonthKeyFromDate, formatLocalDate, daysBetweenLocalDates } from '@shared/date-utils';
import { DEFAULT_DUE_DATE_DAY } from '@academyflo/contracts';
import { buildLateFeeConfigFromAcademy } from '../common/late-fee';
import { randomUUID } from 'crypto';

export interface RunMonthlyDuesEngineInput {
  academyId: string;
  now: Date;
}

export interface RunMonthlyDuesEngineOutput {
  created: number;
  flippedToDue: number;
  snapshotted: number;
}

export class RunMonthlyDuesEngineUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
  ) {}

  async execute(
    input: RunMonthlyDuesEngineInput,
  ): Promise<Result<RunMonthlyDuesEngineOutput, AppError>> {
    const academy = await this.academyRepo.findById(input.academyId);
    if (!academy) {
      return ok({ created: 0, flippedToDue: 0, snapshotted: 0 });
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

    let flippedToDue = 0;
    if (shouldFlipToDue(todayDay, dueDateDay)) {
      const upcoming = await this.feeDueRepo.listUpcomingByAcademyAndMonth(
        input.academyId,
        monthKey,
      );
      if (upcoming.length > 0) {
        const ids = upcoming.map((u) => u.id.toString());
        await this.feeDueRepo.bulkUpdateStatus(ids, 'DUE', 'UPCOMING');
        flippedToDue = upcoming.length;
      }
    }

    // Phase 3: Snapshot late fee config onto overdue dues that haven't been snapshotted yet
    let snapshotted = 0;
    const config = buildLateFeeConfigFromAcademy(academy);
    if (config && academy.lateFeeAmountInr > 0) {

      // Use calendar-day arithmetic on IST YYYY-MM-DD strings so the result
      // doesn't depend on system TZ (with TZ drift the string+parse trick could
      // be off by one near midnight IST).
      const todayStr = formatLocalDate(input.now);

      const unsnapshotted = await this.feeDueRepo.findDueWithoutSnapshot(input.academyId);
      const toSnapshot: FeeDue[] = [];
      for (const due of unsnapshotted) {
        const daysPastDue = daysBetweenLocalDates(due.dueDate, todayStr);
        if (daysPastDue > config.gracePeriodDays) {
          toSnapshot.push(due.snapshotLateFeeConfig(config));
        }
      }
      if (toSnapshot.length > 0) {
        await this.feeDueRepo.bulkSave(toSnapshot);
        snapshotted = toSnapshot.length;
      }
    }

    return ok({ created: toCreate.length, flippedToDue, snapshotted });
  }
}
