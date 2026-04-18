import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';
import type { TransactionPort } from '../../common/transaction.port';
import { BatchErrors, StudentBatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import type { UserRole } from '@playconnect/contracts';
import { randomUUID } from 'crypto';

export interface SetStudentBatchesInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  batchIds: string[];
}

export class SetStudentBatchesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly transaction: TransactionPort,
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
    const currentBatchIds = new Set(currentAssignments.map((a) => a.batchId));
    const newlyAddedBatchIds = uniqueBatchIds.filter((id) => !currentBatchIds.has(id));

    for (const batchId of newlyAddedBatchIds) {
      const batch = batchById.get(batchId)!;
      if (batch.maxStudents !== null) {
        const currentCount = await this.studentBatchRepo.countByBatchId(batchId);
        if (currentCount >= batch.maxStudents) {
          return err(BatchErrors.capacityFull());
        }
      }
    }

    // Build new assignments
    const academyId = actor.academyId;
    const assignments = uniqueBatchIds.map((batchId) =>
      StudentBatch.create({
        id: randomUUID(),
        studentId: input.studentId,
        batchId,
        academyId,
      }),
    );

    // Wrap replace (delete-all + insert-all) in a transaction so a mid-way
    // failure can't leave the student with an empty or partial batch set.
    await this.transaction.run(async () => {
      await this.studentBatchRepo.replaceForStudent(input.studentId, assignments);
    });

    return ok(batches.map(toBatchDto));
  }
}
