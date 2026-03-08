import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestItemSchema,
  type PaymentRequestApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type StaffCancelPaymentRequestApiPort = {
  cancelPaymentRequest(requestId: string): Promise<Result<PaymentRequestApiResponse, AppError>>;
};

export type StaffCancelPaymentRequestDeps = {
  paymentRequestsApi: StaffCancelPaymentRequestApiPort;
};

export async function staffCancelPaymentRequestUseCase(
  deps: StaffCancelPaymentRequestDeps,
  requestId: string,
): Promise<Result<PaymentRequestItem, AppError>> {
  const result = await deps.paymentRequestsApi.cancelPaymentRequest(requestId);

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
