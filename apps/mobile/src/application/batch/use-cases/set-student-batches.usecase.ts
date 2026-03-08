import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { batchArraySchema } from '../../../domain/batch/batch.schemas';

export type SetStudentBatchesApiPort = {
  setStudentBatches(studentId: string, batchIds: string[]): Promise<Result<BatchListItem[], AppError>>;
};

export type SetStudentBatchesDeps = {
  batchApi: SetStudentBatchesApiPort;
};

export async function setStudentBatchesUseCase(
  deps: SetStudentBatchesDeps,
  studentId: string,
  batchIds: string[],
): Promise<Result<BatchListItem[], AppError>> {
  const result = await deps.batchApi.setStudentBatches(studentId, batchIds);

  if (!result.ok) {
    return result;
  }

  const parsed = batchArraySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
