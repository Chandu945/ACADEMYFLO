import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type {
  PaymentRequestItem,
  CreatePaymentRequestInput,
} from '../../../domain/fees/payment-requests.types';
import {
  paymentRequestItemSchema,
  type PaymentRequestApiResponse,
} from '../../../domain/fees/payment-requests.schemas';

export type StaffCreatePaymentRequestApiPort = {
  createPaymentRequest(
    input: CreatePaymentRequestInput,
  ): Promise<Result<PaymentRequestApiResponse, AppError>>;
};

export type StaffCreatePaymentRequestDeps = {
  paymentRequestsApi: StaffCreatePaymentRequestApiPort;
};

export function validatePaymentRequestForm(fields: { staffNotes: string }): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.staffNotes || fields.staffNotes.trim().length < 5) {
    errors['staffNotes'] = 'Notes must be at least 5 characters';
  }
  if (fields.staffNotes && fields.staffNotes.trim().length > 500) {
    errors['staffNotes'] = 'Notes must not exceed 500 characters';
  }

  return errors;
}

export async function staffCreatePaymentRequestUseCase(
  deps: StaffCreatePaymentRequestDeps,
  input: CreatePaymentRequestInput,
): Promise<Result<PaymentRequestItem, AppError>> {
  const result = await deps.paymentRequestsApi.createPaymentRequest(input);

  if (!result.ok) {
    return result;
  }

  const parsed = paymentRequestItemSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[staffCreatePaymentRequestUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Something went wrong. Please try again.' });
  }

  return ok(parsed.data);
}
