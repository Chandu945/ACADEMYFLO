import type { PaymentHistoryItem } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { paymentHistoryListSchema } from '../../../domain/parent/parent.schemas';

export type GetPaymentHistoryApiPort = {
  getPaymentHistory(): Promise<Result<PaymentHistoryItem[], AppError>>;
};

export async function getPaymentHistoryUseCase(
  deps: { parentApi: GetPaymentHistoryApiPort },
): Promise<Result<PaymentHistoryItem[], AppError>> {
  const result = await deps.parentApi.getPaymentHistory();
  if (!result.ok) return result;

  const parsed = paymentHistoryListSchema.safeParse(result.value);
  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return err({ code: 'UNKNOWN', message: `Unexpected server response: ${detail}` });
  }

  return ok(parsed.data);
}
