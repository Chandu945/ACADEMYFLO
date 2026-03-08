import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type {
  PaymentRequestItem,
  RejectPaymentRequestInput,
} from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestItemSchema,
  type PaymentRequestApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type OwnerRejectRequestApiPort = {
  rejectPaymentRequest(
    requestId: string,
    input: RejectPaymentRequestInput,
  ): Promise<Result<PaymentRequestApiResponse, AppError>>;
};

export type OwnerRejectRequestDeps = {
  paymentRequestsApi: OwnerRejectRequestApiPort;
};

export async function ownerRejectRequestUseCase(
  deps: OwnerRejectRequestDeps,
  requestId: string,
  reason: string,
): Promise<Result<PaymentRequestItem, AppError>> {
  const result = await deps.paymentRequestsApi.rejectPaymentRequest(requestId, {
    reason,
  });

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
