import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { PaymentRequestItem, EditPaymentRequestInput } from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestItemSchema,
  type PaymentRequestApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type StaffEditPaymentRequestApiPort = {
  editPaymentRequest(
    requestId: string,
    input: EditPaymentRequestInput,
  ): Promise<Result<PaymentRequestApiResponse, AppError>>;
};

export type StaffEditPaymentRequestDeps = {
  paymentRequestsApi: StaffEditPaymentRequestApiPort;
};

export async function staffEditPaymentRequestUseCase(
  deps: StaffEditPaymentRequestDeps,
  requestId: string,
  input: EditPaymentRequestInput,
): Promise<Result<PaymentRequestItem, AppError>> {
  const result = await deps.paymentRequestsApi.editPaymentRequest(requestId, input);

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestItemSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[staffEditPaymentRequestUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Something went wrong. Please try again.' });
  }

  return ok(parsed.data);
}
