import type { StudentBatch } from '../entities/student-batch.entity';

export const STUDENT_BATCH_REPOSITORY = Symbol('STUDENT_BATCH_REPOSITORY');

export interface StudentBatchRepository {
  replaceForStudent(studentId: string, assignments: StudentBatch[]): Promise<void>;
  findByStudentId(studentId: string): Promise<StudentBatch[]>;
  findByBatchId(batchId: string): Promise<StudentBatch[]>;
  deleteByBatchId(batchId: string): Promise<number>;
  countByBatchId(batchId: string): Promise<number>;
  /**
   * Batched version of countByBatchId — returns a map keyed by batchId.
   * Batches not present in the input are omitted; consumers should treat
   * a missing key as `0`.
   */
  countByBatchIds(batchIds: string[]): Promise<Map<string, number>>;
}
