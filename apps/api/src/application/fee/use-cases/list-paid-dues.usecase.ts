import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { canViewFees } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { FeeDueDto } from '../dtos/fee-due.dto';
import { toFeeDueDto } from '../dtos/fee-due.dto';
import type { UserRole } from '@playconnect/contracts';

export interface ListPaidDuesInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  batchId?: string;
}

export class ListPaidDuesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly studentRepo?: StudentRepository,
    private readonly studentBatchRepo?: StudentBatchRepository,
  ) {}

  async execute(input: ListPaidDuesInput): Promise<Result<FeeDueDto[], AppError>> {
    const check = canViewFees(input.actorRole);
    if (!check.allowed) return err(FeeErrors.viewNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    let dues = await this.feeDueRepo.listByAcademyMonthPaid(user.academyId, input.month);

    // Filter by batch if requested
    if (input.batchId && this.studentBatchRepo) {
      const batchAssignments = await this.studentBatchRepo.findByBatchId(input.batchId);
      const batchStudentIds = new Set(batchAssignments.map((a) => a.studentId));
      dues = dues.filter((d) => batchStudentIds.has(d.studentId));
    }

    // Build student name map
    const nameMap: Record<string, string> = {};
    if (this.studentRepo && dues.length > 0) {
      const uniqueIds = [...new Set(dues.map((d) => d.studentId))];
      const students = await this.studentRepo.findByIds(uniqueIds);
      for (const s of students) {
        nameMap[s.id.toString()] = s.fullName;
      }
    }

    return ok(dues.map((d) => toFeeDueDto(d, undefined, undefined, nameMap[d.studentId])));
  }
}
