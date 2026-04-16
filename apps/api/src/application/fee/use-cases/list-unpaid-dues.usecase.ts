import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { canViewFees } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { FeeDueDto } from '../dtos/fee-due.dto';
import { toFeeDueDto } from '../dtos/fee-due.dto';
import type { UserRole } from '@playconnect/contracts';
import type { ClockPort } from '../../common/clock.port';
import { formatLocalDate } from '../../../shared/date-utils';
import { buildLateFeeConfigFromAcademy } from '../common/late-fee';

export interface ListUnpaidDuesInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  page: number;
  pageSize: number;
}

export interface ListUnpaidDuesOutput {
  items: FeeDueDto[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export class ListUnpaidDuesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly clock: ClockPort,
    private readonly studentRepo?: StudentRepository,
  ) {}

  async execute(input: ListUnpaidDuesInput): Promise<Result<ListUnpaidDuesOutput, AppError>> {
    const check = canViewFees(input.actorRole);
    if (!check.allowed) return err(FeeErrors.viewNotAllowed());

    if (!isValidMonthKey(input.month)) return err(FeeErrors.invalidMonthKey());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const [dues, academy] = await Promise.all([
      this.feeDueRepo.listByAcademyMonthAndStatuses(user.academyId, input.month, [
        'UPCOMING',
        'DUE',
      ]),
      this.academyRepo.findById(user.academyId),
    ]);

    const today = formatLocalDate(this.clock.now());
    const config = buildLateFeeConfigFromAcademy(academy);

    // Build student name map (only for the page slice to avoid unnecessary lookups)
    const total = dues.length;
    const { page, pageSize } = input;
    const start = (page - 1) * pageSize;
    const paged = dues.slice(start, start + pageSize);

    const nameMap: Record<string, string> = {};
    if (this.studentRepo && paged.length > 0) {
      const uniqueIds = [...new Set(paged.map((d) => d.studentId))];
      const students = await this.studentRepo.findByIds(uniqueIds);
      for (const s of students) {
        if (!s.isDeleted()) {
          nameMap[s.id.toString()] = s.fullName;
        }
      }
    }

    return ok({
      items: paged.map((d) => toFeeDueDto(d, config, today, nameMap[d.studentId])),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  }
}
