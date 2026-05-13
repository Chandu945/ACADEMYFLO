import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { TransactionPort } from '../../common/transaction.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { BatchErrors } from '../../common/errors';
import { requireBatchInAcademy } from '../common/require-batch';
import type { UserRole } from '@academyflo/contracts';

export interface DeleteBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
}

export interface DeleteBatchOutput {
  deleted: true;
  /** M6 fix: count of student-batch assignments that were cascaded.
   *  Returned so the UI can show the owner exactly how many students were
   *  unassigned by the delete. */
  studentsUnassigned: number;
}

export class DeleteBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly transaction: TransactionPort,
    /**
     * Used to record BATCH_DELETED audit (H4 fix). Destructive op with no
     * audit trail prior — owners had no record of who deleted which batch
     * or how many students it affected. Optional so legacy fixtures keep
     * working; production wiring always passes it.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: DeleteBatchInput): Promise<Result<DeleteBatchOutput, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(BatchErrors.deleteNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const batchResult = await requireBatchInAcademy(this.batchRepo, input.batchId, actor.academyId);
    if (!batchResult.ok) return err(batchResult.error);
    const batch = batchResult.value;

    // M6 fix: count students BEFORE cascade so we can both record the
    // count in the audit and return it to the caller. `deleteByBatchId`
    // returns its own count but inside the transaction; we want the
    // pre-state to be auditable independently of the cascade result.
    const studentsUnassigned = await this.studentBatchRepo.countByBatchId(input.batchId);

    // Cascade: unassign all students from this batch, then delete batch atomically
    await this.transaction.run(async () => {
      await this.studentBatchRepo.deleteByBatchId(input.batchId);
      await this.batchRepo.deleteById(input.batchId);
    });

    // H4 fix: record BATCH_DELETED with batch name, days, schedule, and
    // the count of cascaded student-batch assignments. The destructive
    // nature of this op means the audit entry must be self-sufficient —
    // someone asking "what did we lose when this batch was deleted" can
    // answer it from the audit log alone.
    if (this.auditRecorder) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'BATCH_DELETED',
        entityType: 'BATCH',
        entityId: input.batchId,
        context: {
          batchName: batch.batchName,
          days: batch.days.join(','),
          ...(batch.startTime ? { startTime: batch.startTime } : {}),
          ...(batch.endTime ? { endTime: batch.endTime } : {}),
          studentsUnassigned: String(studentsUnassigned),
        },
      });
    }

    return ok({ deleted: true as const, studentsUnassigned });
  }
}
