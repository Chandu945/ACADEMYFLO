import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import { canViewReports } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { StudentWiseDueItemDto } from '../dtos/student-wise-dues.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetStudentWiseDuesReportInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export class GetStudentWiseDuesReportUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
  ) {}

  async execute(
    input: GetStudentWiseDuesReportInput,
  ): Promise<Result<StudentWiseDueItemDto[], AppError>> {
    const check = canViewReports(input.actorRole);
    if (!check.allowed) return err(FeeErrors.reportsNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;

    // Load all dues for the selected month and all unpaid dues across months
    const [monthDues, allUnpaid] = await Promise.all([
      this.feeDueRepo.listByAcademyAndMonth(academyId, input.month),
      this.feeDueRepo.listUnpaidByAcademy(academyId),
    ]);

    // Build unpaid aggregation per student
    const unpaidByStudent = new Map<string, { count: number; totalAmount: number }>();
    for (const due of allUnpaid) {
      const existing = unpaidByStudent.get(due.studentId) ?? { count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += due.amount;
      unpaidByStudent.set(due.studentId, existing);
    }

    // Load student names
    const studentIds = [...new Set(monthDues.map((d) => d.studentId))];
    const studentMap = new Map<string, string>();
    for (const sid of studentIds) {
      const student = await this.studentRepo.findById(sid);
      if (student) {
        studentMap.set(sid, student.fullName);
      }
    }

    const items: StudentWiseDueItemDto[] = monthDues.map((due) => {
      const unpaid = unpaidByStudent.get(due.studentId) ?? { count: 0, totalAmount: 0 };
      return {
        studentId: due.studentId,
        studentName: studentMap.get(due.studentId) ?? 'Unknown',
        monthKey: due.monthKey,
        amount: due.amount,
        status: due.status,
        pendingMonthsCount: unpaid.count,
        totalPendingAmount: unpaid.totalAmount,
      };
    });

    return ok(items);
  }
}
