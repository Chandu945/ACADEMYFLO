import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import { feeDueItemSchema } from '../../../domain/fees/fees.schemas';

export type OwnerMarkPaidApiPort = {
  markFeePaid(studentId: string, month: string): Promise<Result<FeeDueItem, AppError>>;
};

export type OwnerMarkPaidDeps = {
  feesApi: OwnerMarkPaidApiPort;
};

export async function ownerMarkPaidUseCase(
  deps: OwnerMarkPaidDeps,
  studentId: string,
  month: string,
): Promise<Result<FeeDueItem, AppError>> {
  const result = await deps.feesApi.markFeePaid(studentId, month);

  if (!result.ok) {
    return result;
  }

  const parsed = feeDueItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
