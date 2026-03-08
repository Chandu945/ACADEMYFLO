import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { canReadBatch } from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import type { StudentDto } from '../../student/dtos/student.dto';
import { toStudentDto } from '../../student/dtos/student.dto';
import type { UserRole } from '@playconnect/contracts';

export interface ListBatchStudentsInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListBatchStudentsOutput {
  data: StudentDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ListBatchStudentsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly studentRepo: StudentRepository,
  ) {}

  async execute(input: ListBatchStudentsInput): Promise<Result<ListBatchStudentsOutput, AppError>> {
    const roleCheck = canReadBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.readNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const batch = await this.batchRepo.findById(input.batchId);
    if (!batch) {
      return err(BatchErrors.notFound(input.batchId));
    }

    if (batch.academyId !== actor.academyId) {
      return err(BatchErrors.notInAcademy());
    }

    const assignments = await this.studentBatchRepo.findByBatchId(input.batchId);
    const studentIds = assignments.map((a) => a.studentId);

    if (studentIds.length === 0) {
      return ok({
        data: [],
        meta: { page: input.page, pageSize: input.pageSize, totalItems: 0, totalPages: 0 },
      });
    }

    const students = await this.studentRepo.findByIds(studentIds);

    // Filter to active, non-deleted students in the actor's academy
    let filtered = students.filter(
      (s) => s.status === 'ACTIVE' && !s.isDeleted() && s.academyId === actor.academyId,
    );

    if (input.search) {
      const searchLower = input.search.trim().toLowerCase();
      filtered = filtered.filter((s) => s.fullName.toLowerCase().startsWith(searchLower));
    }

    // Sort by name for consistent ordering
    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / input.pageSize);
    const start = (input.page - 1) * input.pageSize;
    const page = filtered.slice(start, start + input.pageSize);

    return ok({
      data: page.map(toStudentDto),
      meta: { page: input.page, pageSize: input.pageSize, totalItems, totalPages },
    });
  }
}
