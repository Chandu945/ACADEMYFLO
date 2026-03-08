import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { isEligibleForDue, shouldFlipToDue, computeDueDate } from '@domain/fee/rules/fee.rules';
import { toMonthKeyFromDate } from '@shared/date-utils';
import { DEFAULT_DUE_DATE_DAY } from '@playconnect/contracts';
import { randomUUID } from 'crypto';

export interface RunMonthlyDuesEngineInput {
  academyId: string;
  now: Date;
}

export interface RunMonthlyDuesEngineOutput {
  created: number;
  flippedToDue: number;
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
      return ok({ created: 0, flippedToDue: 0 });
    }

    const dueDateDay = academy.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY;
    const monthKey = toMonthKeyFromDate(input.now);
    const todayDay = input.now.getDate();

    const students = await this.studentRepo.listActiveByAcademy(input.academyId);

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

      const existing = await this.feeDueRepo.findByAcademyStudentMonth(
        input.academyId,
        student.id.toString(),
        monthKey,
      );
      if (existing) continue;

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
        await this.feeDueRepo.bulkUpdateStatus(ids, 'DUE');
        flippedToDue = upcoming.length;
      }
    }

    return ok({ created: toCreate.length, flippedToDue });
  }
}
