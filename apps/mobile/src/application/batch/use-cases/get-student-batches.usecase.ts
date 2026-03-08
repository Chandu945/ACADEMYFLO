import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { batchArraySchema } from '../../../domain/batch/batch.schemas';

export type GetStudentBatchesApiPort = {
  getStudentBatches(studentId: string): Promise<Result<BatchListItem[], AppError>>;
};

export type GetStudentBatchesDeps = {
  batchApi: GetStudentBatchesApiPort;
};

export async function getStudentBatchesUseCase(
  deps: GetStudentBatchesDeps,
  studentId: string,
): Promise<Result<BatchListItem[], AppError>> {
  const result = await deps.batchApi.getStudentBatches(studentId);

  if (!result.ok) {
    return result;
  }

  const parsed = batchArraySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
