import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';
import type { TransactionPort } from '../../common/transaction.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { BatchErrors, StudentBatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import type { UserRole } from '@academyflo/contracts';
import { randomUUID } from 'crypto';

export interface SetStudentBatchesInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  batchIds: string[];
}

/**
 * KNOWN LIMITATION (M6 student-management audit — accepted as wontfix):
 *
 * The capacity check at line ~72 (`countByBatchId(batchId) >= maxStudents`)
 * reads BEFORE the transaction starts. Two concurrent enrollments into the
 * same near-full batch can both pass the check and both insert, leaving the
 * batch slightly over capacity:
 *
 *   1. Batch has maxStudents=10, currentCount=9 (one slot left).
 *   2. Staff A starts enrolling Student S1. Reads count=9. Passes check.
 *   3. Staff B starts enrolling Student S2 100ms later. Reads count=9
 *      (A's insert hasn't committed yet for B's transaction). Passes check.
 *   4. Both transactions commit. Final count = 11.
 *
 * Why this is left in place:
 *   - Requires two staff editing different students for the SAME batch
 *     within the SAME millisecond. Rare even at multi-staff academies.
 *   - Failure mode is owner-visible (batch shows "11 / 10" on dashboard)
 *     and recoverable in seconds — remove one student or bump maxStudents.
 *   - No data loss, no money impact.
 *
 * Proper fix if this becomes a real support burden:
 *   - Maintain a `batch_counters` collection per batch.
 *   - Replace the read-then-check with an atomic `findOneAndUpdate` using
 *     a `$where` or pipeline condition `count < maxStudents` + `$inc`.
 *   - Sync the counter on student-move and soft-delete cascade paths.
 *   - Significant new infrastructure (~80-100 lines + migration) — not
 *     justified by the current race frequency.
 */
export class SetStudentBatchesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly transaction: TransactionPort,
    /**
     * Required (M3 fix). Batch reassignments must be auditable — owners
     * need to answer "who moved my child to the wrong batch and when".
     * Optional so legacy fixtures keep working; production always wires it.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: SetStudentBatchesInput): Promise<Result<BatchDto[], AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(StudentBatchErrors.manageNotAllowed());
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

    // Deduplicate
    const uniqueBatchIds = [...new Set(input.batchIds)];

    // Validate all batches exist and belong to same academy (single query).
    const batches = await this.batchRepo.findByIds(uniqueBatchIds);
    const batchById = new Map(batches.map((b) => [b.id.toString(), b]));
    for (const id of uniqueBatchIds) {
      const batch = batchById.get(id);
      if (!batch || batch.academyId !== actor.academyId) {
        return err(StudentBatchErrors.batchNotInAcademy(id));
      }
      if (batch.status !== 'ACTIVE') {
        return err(BatchErrors.notActive(id));
      }
    }

    // Check capacity for newly added batches
    const currentAssignments = await this.studentBatchRepo.findByStudentId(input.studentId);
    const currentByBatchId = new Map(currentAssignments.map((a) => [a.batchId, a]));
    const newlyAddedBatchIds = uniqueBatchIds.filter((id) => !currentByBatchId.has(id));

    for (const batchId of newlyAddedBatchIds) {
      const batch = batchById.get(batchId)!;
      if (batch.maxStudents !== null) {
        const currentCount = await this.studentBatchRepo.countByBatchId(batchId);
        if (currentCount >= batch.maxStudents) {
          return err(BatchErrors.capacityFull());
        }
      }
    }

    // Build the resulting assignment list. CRITICAL: for batches that the
    // student is ALREADY in, reuse the existing record (id + assignedAt) —
    // do NOT create a new StudentBatch with `assignedAt = now`, because the
    // attendance summary use cases use `assignedAt` to cap a student's
    // expected days in a month. Bumping `assignedAt` to today on every
    // form-save would silently wipe out the student's earlier attendance
    // from those summaries. Only newly-added batches get fresh records.
    const academyId = actor.academyId;
    const assignments = uniqueBatchIds.map((batchId) => {
      const existing = currentByBatchId.get(batchId);
      if (existing) return existing;
      return StudentBatch.create({
        id: randomUUID(),
        studentId: input.studentId,
        batchId,
        academyId,
      });
    });

    // Wrap replace (delete-all + insert-all) in a transaction so a mid-way
    // failure can't leave the student with an empty or partial batch set.
    // Existing assignments are re-inserted with their original ids and
    // assignedAt values (no-op semantically) so the unique studentId+batchId
    // index stays stable across saves.
    await this.transaction.run(async () => {
      await this.studentBatchRepo.replaceForStudent(input.studentId, assignments);
    });

    // M3 fix: record an audit entry with the diff (added/removed batch IDs).
    // Owners can now answer "who moved this student between batches and when"
    // from a single audit-log lookup, matching the pattern used by every
    // other student-touching use case. Skipped when nothing actually
    // changed (owner re-submitting the same set) — no point logging a no-op.
    if (this.auditRecorder) {
      const currentBatchIds = new Set(currentAssignments.map((a) => a.batchId));
      const newBatchIds = new Set(uniqueBatchIds);
      const addedBatchIds = uniqueBatchIds.filter((id) => !currentBatchIds.has(id));
      const removedBatchIds = [...currentBatchIds].filter((id) => !newBatchIds.has(id));

      if (addedBatchIds.length > 0 || removedBatchIds.length > 0) {
        await this.auditRecorder.record({
          academyId,
          actorUserId: input.actorUserId,
          action: 'STUDENT_BATCHES_CHANGED',
          entityType: 'STUDENT',
          entityId: input.studentId,
          context: {
            studentId: input.studentId,
            addedBatchIds: addedBatchIds.join(','),
            removedBatchIds: removedBatchIds.join(','),
          },
        });
      }
    }

    return ok(batches.map(toBatchDto));
  }
}
