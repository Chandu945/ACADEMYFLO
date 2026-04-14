import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import { feeDueItemSchema } from '../../../domain/fees/fees.schemas';

export type OwnerMarkPaidApiPort = {
  markFeePaid(studentId: string, month: string, paymentLabel?: string): Promise<Result<FeeDueItem, AppError>>;
};

export type OwnerMarkPaidDeps = {
  feesApi: OwnerMarkPaidApiPort;
};

export async function ownerMarkPaidUseCase(
  deps: OwnerMarkPaidDeps,
  studentId: string,
  month: string,
  paymentLabel?: string,
): Promise<Result<FeeDueItem, AppError>> {
  const result = await deps.feesApi.markFeePaid(studentId, month, paymentLabel);

  if (!result.ok) {
    return result;
  }

  const parsed = feeDueItemSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[ownerMarkPaidUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Failed to mark fee as paid. Please try again.' });
  }

  return ok(parsed.data);
}
