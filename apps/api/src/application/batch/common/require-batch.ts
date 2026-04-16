import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { Batch } from '@domain/batch/entities/batch.entity';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { BatchErrors } from '../../common/errors';

/**
 * Load a batch by id and assert it belongs to the given academy.
 * Consolidates the find + null-check + academy-check boilerplate that
 * appears in every single-batch use case.
 */
export async function requireBatchInAcademy(
  batchRepo: BatchRepository,
  batchId: string,
  academyId: string,
): Promise<Result<Batch, AppError>> {
  const batch = await batchRepo.findById(batchId);
  if (!batch) return err(BatchErrors.notFound(batchId));
  if (batch.academyId !== academyId) return err(BatchErrors.notInAcademy());
  return ok(batch);
}
