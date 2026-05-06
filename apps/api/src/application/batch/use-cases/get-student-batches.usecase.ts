import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { StudentBatchErrors } from '../../common/errors';
import { toBatchDto } from '../dtos/batch.dto';
import type { BatchListItemDto } from './list-batches.usecase';
import type { UserRole } from '@academyflo/contracts';

export interface GetStudentBatchesInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export class GetStudentBatchesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
  ) {}

  async execute(
    input: GetStudentBatchesInput,
  ): Promise<Result<BatchListItemDto[], AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(StudentBatchErrors.viewNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentBatchErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentBatchErrors.studentNotFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentBatchErrors.studentNotInAcademy());
    }

    const assignments = await this.studentBatchRepo.findByStudentId(input.studentId);
    const batchIds = assignments.map((a) => a.batchId);

    // Single $in query — was N separate findById round-trips.
    const batches = await this.batchRepo.findByIds(batchIds);

    // Enrich each batch with its current studentCount so the response shape
    // matches GET /batches. The mobile schema (batchListItemSchema) requires
    // studentCount; without it the per-student endpoint fails Zod validation
    // and the form silently shows an empty selection — letting the user
    // accidentally clear their real batches by hitting Save.
    const idStrings = batches.map((b) => b.id.toString());
    const countByBatch =
      idStrings.length > 0
        ? await this.studentBatchRepo.countByBatchIds(idStrings)
        : new Map<string, number>();

    const data: BatchListItemDto[] = batches.map((batch) => ({
      ...toBatchDto(batch),
      studentCount: countByBatch.get(batch.id.toString()) ?? 0,
    }));

    return ok(data);
  }
}
