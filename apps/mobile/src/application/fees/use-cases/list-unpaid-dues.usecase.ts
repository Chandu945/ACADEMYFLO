import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import {
  feeDuePaginatedResponseSchema,
  type FeeDuePaginatedApiResponse,
} from '../../../domain/fees/fees.schemas';

export type ListUnpaidDuesApiPort = {
  listUnpaidDues(
    month: string,
    page: number,
    pageSize: number,
  ): Promise<Result<FeeDuePaginatedApiResponse, AppError>>;
};

export type ListUnpaidDuesDeps = {
  feesApi: ListUnpaidDuesApiPort;
};

export type UnpaidDuesPaginatedResult = {
  items: FeeDueItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function listUnpaidDuesUseCase(
  deps: ListUnpaidDuesDeps,
  month: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<Result<UnpaidDuesPaginatedResult, AppError>> {
  const result = await deps.feesApi.listUnpaidDues(month, page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = feeDuePaginatedResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
