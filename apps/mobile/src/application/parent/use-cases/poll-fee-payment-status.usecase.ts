import type { FeePaymentStatusResponse } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { feePaymentStatusResponseSchema } from '../../../domain/parent/parent.schemas';

export type PollFeePaymentStatusApiPort = {
  getFeePaymentStatus(orderId: string): Promise<Result<FeePaymentStatusResponse, AppError>>;
};

export async function pollFeePaymentStatusUseCase(
  deps: { parentApi: PollFeePaymentStatusApiPort },
  orderId: string,
): Promise<Result<FeePaymentStatusResponse, AppError>> {
  const result = await deps.parentApi.getFeePaymentStatus(orderId);
  if (!result.ok) return result;

  const parsed = feePaymentStatusResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
