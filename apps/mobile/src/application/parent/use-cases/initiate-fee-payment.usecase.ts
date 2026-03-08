import type { InitiateFeePaymentResponse } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { initiateFeePaymentResponseSchema } from '../../../domain/parent/parent.schemas';

export type InitiateFeePaymentApiPort = {
  initiateFeePayment(feeDueId: string): Promise<Result<InitiateFeePaymentResponse, AppError>>;
};

export async function initiateFeePaymentUseCase(
  deps: { parentApi: InitiateFeePaymentApiPort },
  feeDueId: string,
): Promise<Result<InitiateFeePaymentResponse, AppError>> {
  const result = await deps.parentApi.initiateFeePayment(feeDueId);
  if (!result.ok) return result;

  const parsed = initiateFeePaymentResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
