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
import { buildLateFeeConfigFromAcademy, buildEffectiveLateFeeConfig } from '../common/late-fee';
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

    const [overdueDuesAll, academy] = await Promise.all([
      this.feeDueRepo.listOverdueByAcademy(academyId, today),
      this.academyRepo.findById(academyId),
    ]);

    const config = buildLateFeeConfigFromAcademy(academy);

    // Hide overdue rows for soft-deleted students — they're preserved in
    // the DB for audit, but on the active Overdue Students screen they'd
    // appear as unattributable ghost rows ("Unknown" + amount, no actions
    // available). studentRepo.findByIds already filters deletedAt:null at
    // the DB layer, so the returned set IS the alive subset; everything
    // missing from it is treated as deleted and dropped.
    const allStudentIds = [...new Set(overdueDuesAll.map((d) => d.studentId))];
    const nameMap: Record<string, string> = {};
    if (allStudentIds.length > 0) {
      const aliveStudents = await this.studentRepo.findByIds(allStudentIds);
      for (const s of aliveStudents) {
        nameMap[s.id.toString()] = s.fullName;
      }
    }
    const overdueDues = overdueDuesAll.filter((d) => nameMap[d.studentId] !== undefined);

    // Group by studentId (deleted students already filtered out above)
    const grouped = new Map<string, typeof overdueDues>();
    for (const due of overdueDues) {
      const existing = grouped.get(due.studentId);
      if (existing) {
        existing.push(due);
      } else {
        grouped.set(due.studentId, [due]);
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

        // Compute late fee. The helper enforces L1 (live disable kills it)
        // and M1 (snapshot locks the amount).
        const effectiveConfig = buildEffectiveLateFeeConfig(due.lateFeeConfigSnapshot, config);
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
