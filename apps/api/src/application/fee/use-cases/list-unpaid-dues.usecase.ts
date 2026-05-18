import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { Student } from '@domain/student/entities/student.entity';
import { canViewFees } from '@domain/fee/rules/fee.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { FeeErrors } from '../../common/errors';
import type { FeeDueDto } from '../dtos/fee-due.dto';
import { toFeeDueDto } from '../dtos/fee-due.dto';
import type { UserRole } from '@academyflo/contracts';
import type { ClockPort } from '../../common/clock.port';
import { formatLocalDate } from '../../../shared/date-utils';
import { buildLateFeeConfigFromAcademy } from '../common/late-fee';

/** Project a Student entity down to the only field we need on this screen. */
function toStudentName(s: Student): string {
  return s.fullName;
}

export interface ListUnpaidDuesInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  page: number;
  pageSize: number;
  batchId?: string;
  /** Optional name-prefix filter. When set, the use case resolves matching
   *  students via the student repo (prefix match on `fullNameNormalized`)
   *  and narrows the dues list to those student ids before paginating, so
   *  search returns complete results across the entire month — not just
   *  the page already loaded on the client. */
  search?: string;
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
    private readonly studentBatchRepo?: StudentBatchRepository,
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

    // Hide dues for soft-deleted students. They're preserved in the DB
    // (financial audit) but rendering them on the active dues list creates
    // unactionable "ghost rows" — no name, no avatar, can't be marked paid
    // because the student record is gone. studentRepo.findByIds already
    // filters deletedAt:null at the DB layer, so the returned set is the
    // alive-students subset; everything else is treated as deleted.
    let filteredDues = dues;
    let aliveStudentsById = new Map<string, ReturnType<typeof toStudentName>>();
    if (this.studentRepo && dues.length > 0) {
      const uniqueIds = [...new Set(dues.map((d) => d.studentId))];
      const aliveStudents = await this.studentRepo.findByIds(uniqueIds);
      aliveStudentsById = new Map(
        aliveStudents.map((s) => [s.id.toString(), toStudentName(s)]),
      );
      filteredDues = dues.filter((d) => aliveStudentsById.has(d.studentId));
    }

    // Filter by batch if requested
    if (input.batchId && this.studentBatchRepo) {
      const batchAssignments = await this.studentBatchRepo.findByBatchId(input.batchId);
      const batchStudentIds = new Set(batchAssignments.map((a) => a.studentId));
      filteredDues = filteredDues.filter((d) => batchStudentIds.has(d.studentId));
    }

    // Filter by name search if requested. Reuses the existing student.list
    // search path (prefix match on `fullNameNormalized`) so the UX is
    // consistent with the students screen. Capped at 1000 hits — academies
    // exceeding that with a single prefix are extreme outliers; if it
    // becomes a real concern we'll add a dedicated `findIdsByNameLike`.
    const trimmedSearch = input.search?.trim();
    if (trimmedSearch && this.studentRepo) {
      const { students } = await this.studentRepo.list(
        { academyId: user.academyId, search: trimmedSearch },
        1,
        1000,
      );
      const matchedIds = new Set(students.map((s) => s.id.toString()));
      filteredDues = filteredDues.filter((d) => matchedIds.has(d.studentId));
    }

    // Build student name map. We already fetched alive students above —
    // reuse that result so the page-slice loop doesn't re-query.
    const total = filteredDues.length;
    const { page, pageSize } = input;
    const start = (page - 1) * pageSize;
    const paged = filteredDues.slice(start, start + pageSize);

    const nameMap: Record<string, string> = {};
    for (const d of paged) {
      const name = aliveStudentsById.get(d.studentId);
      if (name) nameMap[d.studentId] = name;
    }

    return ok({
      items: paged.map((d) => toFeeDueDto(d, config, today, nameMap[d.studentId])),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  }
}
