import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { BatchErrors, StudentBatchErrors } from '../../common/errors';
import { requireBatchInAcademy } from '../common/require-batch';
import type { UserRole } from '@academyflo/contracts';
import { randomUUID } from 'crypto';

export interface AddStudentToBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  studentId: string;
}

export class AddStudentToBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly studentRepo: StudentRepository,
    /**
     * Used to record BATCH_STUDENT_ADDED audit (M1 fix). Optional.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: AddStudentToBatchInput): Promise<Result<void, AppError>> {
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

    if (batch.status !== 'ACTIVE') {
      return err(BatchErrors.notActive(input.batchId));
    }

    // Pre-flight capacity check — UX only. The race-safe enforcement
    // happens post-insert (see H3 fix below).
    if (batch.maxStudents !== null) {
      const currentCount = await this.studentBatchRepo.countByBatchId(input.batchId);
      if (currentCount >= batch.maxStudents) {
        return err(BatchErrors.capacityFull());
      }
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentBatchErrors.studentNotFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentBatchErrors.studentNotInAcademy());
    }

    const currentAssignments = await this.studentBatchRepo.findByStudentId(input.studentId);

    // Idempotent: if already assigned, return success
    if (currentAssignments.some((a) => a.batchId === input.batchId)) {
      return ok(undefined);
    }

    const newAssignment = StudentBatch.create({
      id: randomUUID(),
      studentId: input.studentId,
      batchId: input.batchId,
      academyId: actor.academyId!,
    });

    await this.studentBatchRepo.replaceForStudent(input.studentId, [
      ...currentAssignments,
      newAssignment,
    ]);

    // H3 fix: race-safe capacity enforcement with a deterministic winner.
    //
    // Prior bug: pre-flight check then insert. Two concurrent adds at
    // count = MAX-1 both pass the check, both insert → batch has MAX+1
    // students. Same H1-from-gallery pattern.
    //
    // Fixed approach: after insert, list ALL student-batch records sorted
    // ASC by (assignedAt, id). If MY assignment is at index >= maxStudents
    // it's an over-quota straggler — roll it back. Earlier assignments
    // keep their slot. One-and-only-one winner among racers.
    if (batch.maxStudents !== null) {
      const allAssignments = await this.studentBatchRepo.findByBatchId(input.batchId);
      const sortedAsc = [...allAssignments].sort((a, b) => {
        const t = a.assignedAt.getTime() - b.assignedAt.getTime();
        if (t !== 0) return t;
        return a.id.toString().localeCompare(b.id.toString());
      });
      const myIndex = sortedAsc.findIndex(
        (a) => a.studentId === input.studentId && a.batchId === input.batchId,
      );
      if (myIndex === -1 || myIndex >= batch.maxStudents) {
        // Roll back my insert by replaying the student's pre-add assignment
        // set (without this batch).
        await this.studentBatchRepo.replaceForStudent(input.studentId, currentAssignments);
        return err(BatchErrors.capacityFull());
      }
    }

    // M1 fix: record BATCH_STUDENT_ADDED audit so owners can answer
    // "who put this student in this batch and when".
    if (this.auditRecorder) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'BATCH_STUDENT_ADDED',
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
