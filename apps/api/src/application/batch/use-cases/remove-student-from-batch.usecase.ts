import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { BatchErrors, StudentBatchErrors } from '../../common/errors';
import { requireBatchInAcademy } from '../common/require-batch';
import type { UserRole } from '@academyflo/contracts';

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
    /**
     * Used to record BATCH_STUDENT_REMOVED audit (M1 fix). Optional.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: RemoveStudentFromBatchInput): Promise<Result<void, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(StudentBatchErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const batchResult = await requireBatchInAcademy(this.batchRepo, input.batchId, actor.academyId);
    if (!batchResult.ok) return err(batchResult.error);
    const batch = batchResult.value;

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentBatchErrors.studentNotFound(input.studentId));
    }
    // Without this tenant guard, any OWNER could pass a studentId from
    // another academy and mutate that academy's batch assignments.
    // `add-student-to-batch` and `set-student-batches` already check this;
    // the delete path was the only gap.
    if (student.academyId !== actor.academyId) {
      return err(StudentBatchErrors.studentNotInAcademy());
    }

    const currentAssignments = await this.studentBatchRepo.findByStudentId(input.studentId);
    const wasAssigned = currentAssignments.some((a) => a.batchId === input.batchId);
    const remaining = currentAssignments.filter((a) => a.batchId !== input.batchId);

    await this.studentBatchRepo.replaceForStudent(input.studentId, remaining);

    // M1 fix: record BATCH_STUDENT_REMOVED audit only when an actual
    // assignment was removed. Idempotent calls (already-not-assigned)
    // shouldn't pollute the audit log.
    if (this.auditRecorder && wasAssigned) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'BATCH_STUDENT_REMOVED',
        entityType: 'BATCH',
        entityId: input.batchId,
        context: {
          batchName: batch.batchName,
          studentId: input.studentId,
          studentName: student.fullName,
        },
      });
    }

    return ok(undefined);
  }
}
