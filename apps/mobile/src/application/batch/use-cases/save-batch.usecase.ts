import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { err } from '../../../domain/common/result';
import type { CreateBatchRequest, UpdateBatchRequest } from '../../../domain/batch/batch.types';

export type SaveBatchApiPort = {
  createBatch(req: CreateBatchRequest): Promise<Result<unknown, AppError>>;
  updateBatch(id: string, req: UpdateBatchRequest): Promise<Result<unknown, AppError>>;
};

export type SaveBatchDeps = {
  saveApi: SaveBatchApiPort;
};

export function validateBatchForm(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields['batchName']?.trim()) {
    errors['batchName'] = 'Batch name is required';
  } else if (fields['batchName']!.trim().length < 2) {
    errors['batchName'] = 'Batch name must be at least 2 characters';
  } else if (fields['batchName']!.trim().length > 60) {
    errors['batchName'] = 'Batch name must not exceed 60 characters';
  }

  // days is optional — no validation required

  if (fields['notes'] && fields['notes'].length > 500) {
    errors['notes'] = 'Notes must not exceed 500 characters';
  }

  return errors;
}

export async function saveBatchUseCase(
  deps: SaveBatchDeps,
  mode: 'create' | 'edit',
  batchId: string | undefined,
  data: CreateBatchRequest,
): Promise<Result<unknown, AppError>> {
  if (mode === 'edit' && batchId) {
    return deps.saveApi.updateBatch(batchId, data);
  }
  if (mode === 'create') {
    return deps.saveApi.createBatch(data);
  }
  return err({ code: 'UNKNOWN', message: 'Invalid mode' });
}
