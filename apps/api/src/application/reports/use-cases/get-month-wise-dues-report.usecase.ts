import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import { canViewReports } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { MonthWiseDuesSummaryDto, MonthWiseDueItemDto } from '../dtos/month-wise-dues.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetMonthWiseDuesReportInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export class GetMonthWiseDuesReportUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
  ) {}

  async execute(
    input: GetMonthWiseDuesReportInput,
  ): Promise<Result<MonthWiseDuesSummaryDto, AppError>> {
    const check = canViewReports(input.actorRole);
    if (!check.allowed) return err(FeeErrors.reportsNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;
    const allDues = await this.feeDueRepo.listByAcademyAndMonth(academyId, input.month);

    // Load student names
    const studentIds = [...new Set(allDues.map((d) => d.studentId))];
    const studentMap = new Map<string, string>();
    for (const sid of studentIds) {
      const student = await this.studentRepo.findById(sid);
      if (student) {
        studentMap.set(sid, student.fullName);
      }
    }

    let paidCount = 0;
    let unpaidCount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;

    const dues: MonthWiseDueItemDto[] = allDues.map((due) => {
      if (due.status === 'PAID') {
        paidCount++;
        paidAmount += due.amount;
      } else {
        unpaidCount++;
        unpaidAmount += due.amount;
      }

      return {
        id: due.id.toString(),
        studentId: due.studentId,
        studentName: studentMap.get(due.studentId) ?? 'Unknown',
        monthKey: due.monthKey,
        dueDate: due.dueDate,
        amount: due.amount,
        status: due.status,
        paidAt: due.paidAt ? due.paidAt.toISOString() : null,
        paidSource: due.paidSource,
      };
    });

    return ok({
      month: input.month,
      totalDues: allDues.length,
      paidCount,
      unpaidCount,
      paidAmount,
      unpaidAmount,
      dues,
    });
  }
}
