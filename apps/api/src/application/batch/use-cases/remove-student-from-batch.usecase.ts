import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { BatchErrors, StudentBatchErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface RemoveStudentFromBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  studentId: string;
}

export class RemoveStudentFromBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly studentRepo: StudentRepository,
  ) {}

  async execute(input: RemoveStudentFromBatchInput): Promise<Result<void, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(StudentBatchErrors.manageNotAllowed());
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

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentBatchErrors.studentNotFound(input.studentId));
    }

    const currentAssignments = await this.studentBatchRepo.findByStudentId(input.studentId);
    const remaining = currentAssignments.filter((a) => a.batchId !== input.batchId);

    await this.studentBatchRepo.replaceForStudent(input.studentId, remaining);

    return ok(undefined);
  }
}
