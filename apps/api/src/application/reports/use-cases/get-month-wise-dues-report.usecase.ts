import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { canViewReports } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { MonthWiseDuesSummaryDto, MonthWiseDueItemDto } from '../dtos/month-wise-dues.dto';
import type { UserRole } from '@academyflo/contracts';
import { computeLateFee } from '@academyflo/contracts';
import type { ClockPort } from '../../common/clock.port';
import { formatLocalDate } from '../../../shared/date-utils';
import {
  buildLateFeeConfigFromAcademy,
  buildEffectiveLateFeeConfig,
} from '../../fee/common/late-fee';

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
    private readonly academyRepo: AcademyRepository,
    private readonly clock: ClockPort,
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
    const [allDues, academy] = await Promise.all([
      this.feeDueRepo.listByAcademyAndMonth(academyId, input.month),
      this.academyRepo.findById(academyId),
    ]);

    // Load student names
    const studentIds = [...new Set(allDues.map((d) => d.studentId))];
    const studentMap = new Map<string, string>();
    for (const sid of studentIds) {
      const student = await this.studentRepo.findById(sid);
      if (student) {
        studentMap.set(sid, student.fullName);
      }
    }

    const liveConfig = buildLateFeeConfigFromAcademy(academy);
    const todayStr = formatLocalDate(this.clock.now());

    let paidCount = 0;
    let unpaidCount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;

    const dues: MonthWiseDueItemDto[] = allDues.map((due) => {
      let lateFee = 0;
      if (due.status === 'PAID') {
        // Snapshotted at approval — same value the parent paid.
        lateFee = due.lateFeeApplied ?? 0;
      } else {
        const effectiveConfig = buildEffectiveLateFeeConfig(due.lateFeeConfigSnapshot, liveConfig);
        if (effectiveConfig) {
          const computed = computeLateFee(due.dueDate, todayStr, effectiveConfig);
          if (Number.isFinite(computed)) lateFee = computed;
        }
      }
      const totalPayable = due.amount + lateFee;

      if (due.status === 'PAID') {
        paidCount++;
        paidAmount += totalPayable;
      } else {
        unpaidCount++;
        unpaidAmount += totalPayable;
      }

      return {
        id: due.id.toString(),
        studentId: due.studentId,
        studentName: studentMap.get(due.studentId) ?? 'Unknown',
        monthKey: due.monthKey,
        dueDate: due.dueDate,
        amount: due.amount,
        lateFee,
        totalPayable,
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
