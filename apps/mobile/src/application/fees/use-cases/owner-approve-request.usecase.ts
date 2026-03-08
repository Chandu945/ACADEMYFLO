import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestItemSchema,
  type PaymentRequestApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type OwnerApproveRequestApiPort = {
  approvePaymentRequest(requestId: string): Promise<Result<PaymentRequestApiResponse, AppError>>;
};

export type OwnerApproveRequestDeps = {
  paymentRequestsApi: OwnerApproveRequestApiPort;
};

export async function ownerApproveRequestUseCase(
  deps: OwnerApproveRequestDeps,
  requestId: string,
): Promise<Result<PaymentRequestItem, AppError>> {
  const result = await deps.paymentRequestsApi.approvePaymentRequest(requestId);

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
