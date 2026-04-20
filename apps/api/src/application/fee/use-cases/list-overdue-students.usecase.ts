import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { canViewFees } from '@domain/fee/rules/fee.rules';
import { FeeErrors } from '../../common/errors';
import { formatLocalDate, daysBetweenLocalDates } from '@shared/date-utils';
import { buildLateFeeConfigFromAcademy } from '../common/late-fee';
import { computeLateFee } from '@academyflo/contracts';
import type { UserRole } from '@academyflo/contracts';

export interface ListOverdueStudentsInput {
  actorUserId: string;
  actorRole: UserRole;
}

export interface OverdueStudentItem {
  studentId: string;
  studentName: string;
  overdueMonths: number;
  totalBaseAmount: number;
  totalLateFee: number;
  totalPayable: number;
  oldestDueDate: string;
  daysOverdue: number;
}

export interface ListOverdueStudentsOutput {
  items: OverdueStudentItem[];
  totalOverdueAmount: number;
  totalLateFees: number;
}

export class ListOverdueStudentsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly studentRepo: StudentRepository,
  ) {}

  async execute(
    input: ListOverdueStudentsInput,
  ): Promise<Result<ListOverdueStudentsOutput, AppError>> {
    const check = canViewFees(input.actorRole);
    if (!check.allowed) return err(FeeErrors.viewNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;
    const today = formatLocalDate(new Date());

    const [overdueDues, academy] = await Promise.all([
      this.feeDueRepo.listOverdueByAcademy(academyId, today),
      this.academyRepo.findById(academyId),
    ]);

    const config = buildLateFeeConfigFromAcademy(academy);

    // Group by studentId
    const grouped = new Map<string, typeof overdueDues>();
    for (const due of overdueDues) {
      const existing = grouped.get(due.studentId);
      if (existing) {
        existing.push(due);
      } else {
        grouped.set(due.studentId, [due]);
      }
    }

    // Look up student names
    const studentIds = [...grouped.keys()];
    const nameMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const students = await this.studentRepo.findByIds(studentIds);
      for (const s of students) {
        nameMap[s.id.toString()] = s.fullName;
      }
    }

    // Build items
    const items: OverdueStudentItem[] = [];
    let totalOverdueAmount = 0;
    let totalLateFees = 0;

    for (const [studentId, dues] of grouped) {
      let totalBaseAmount = 0;
      let totalLateFee = 0;
      let oldestDueDate = dues[0]!.dueDate;

      for (const due of dues) {
        totalBaseAmount += due.amount;

        // Compute late fee: prefer snapshot config over live config
        const effectiveConfig = due.lateFeeConfigSnapshot ?? config;
        if (effectiveConfig) {
          totalLateFee += computeLateFee(due.dueDate, today, effectiveConfig);
        }

        if (due.dueDate < oldestDueDate) {
          oldestDueDate = due.dueDate;
        }
      }

      const daysOverdue = daysBetweenLocalDates(oldestDueDate, today);
      const totalPayable = totalBaseAmount + totalLateFee;

      items.push({
        studentId,
        studentName: nameMap[studentId] ?? 'Unknown',
        overdueMonths: dues.length,
        totalBaseAmount,
        totalLateFee,
        totalPayable,
        oldestDueDate,
        daysOverdue,
      });

      totalOverdueAmount += totalPayable;
      totalLateFees += totalLateFee;
    }

    // Sort by daysOverdue descending (most overdue first)
    items.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return ok({
      items,
      totalOverdueAmount,
      totalLateFees,
    });
  }
}
