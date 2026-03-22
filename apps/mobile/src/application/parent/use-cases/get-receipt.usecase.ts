import type { ReceiptInfo } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { receiptSchema } from '../../../domain/parent/parent.schemas';

export type GetReceiptApiPort = {
  getReceipt(feeDueId: string): Promise<Result<ReceiptInfo, AppError>>;
};

export async function getReceiptUseCase(
  deps: { parentApi: GetReceiptApiPort },
  feeDueId: string,
): Promise<Result<ReceiptInfo, AppError>> {
  const result = await deps.parentApi.getReceipt(feeDueId);
  if (!result.ok) return result;

  const parsed = receiptSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
