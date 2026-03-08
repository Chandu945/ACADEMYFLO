import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import {
  feeDueListResponseSchema,
  type FeeDueListApiResponse,
} from '../../../domain/fees/fees.schemas';

export type ListUnpaidDuesApiPort = {
  listUnpaidDues(month: string): Promise<Result<FeeDueListApiResponse, AppError>>;
};

export type ListUnpaidDuesDeps = {
  feesApi: ListUnpaidDuesApiPort;
};

export async function listUnpaidDuesUseCase(
  deps: ListUnpaidDuesDeps,
  month: string,
): Promise<Result<FeeDueItem[], AppError>> {
  const result = await deps.feesApi.listUnpaidDues(month);

  if (!result.ok) {
    return result;
  }

  const parsed = feeDueListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
