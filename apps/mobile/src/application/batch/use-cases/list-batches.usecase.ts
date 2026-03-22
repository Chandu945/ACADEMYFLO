import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import {
  batchListResponseSchema,
  type BatchListApiResponse,
} from '../../../domain/batch/batch.schemas';

export type BatchApiPort = {
  listBatches(
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<Result<BatchListApiResponse, AppError>>;
};

export type ListBatchesDeps = {
  batchApi: BatchApiPort;
};

export type ListBatchesResult = {
  items: BatchListItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listBatchesUseCase(
  deps: ListBatchesDeps,
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<ListBatchesResult, AppError>> {
  const result = await deps.batchApi.listBatches(page, pageSize, search);

  if (!result.ok) {
    return result;
  }

  const parsed = batchListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
