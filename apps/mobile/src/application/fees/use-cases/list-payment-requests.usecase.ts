import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestListResponseSchema,
  type PaymentRequestListApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type ListPaymentRequestsApiPort = {
  listPaymentRequests(status?: string): Promise<Result<PaymentRequestListApiResponse, AppError>>;
};

export type ListPaymentRequestsDeps = {
  paymentRequestsApi: ListPaymentRequestsApiPort;
};

export type ListPaymentRequestsResult = {
  items: PaymentRequestItem[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export async function listPaymentRequestsUseCase(
  deps: ListPaymentRequestsDeps,
  status?: string,
): Promise<Result<ListPaymentRequestsResult, AppError>> {
  const result = await deps.paymentRequestsApi.listPaymentRequests(status);

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok({ items: parsed.data.data, meta: parsed.data.meta });
}
