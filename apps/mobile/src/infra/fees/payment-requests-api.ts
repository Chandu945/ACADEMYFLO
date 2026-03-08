import type {
  PaymentRequestApiResponse,
  PaymentRequestListApiResponse,
} from '../../domain/fees/payment-requests.schemas';
import type {
  CreatePaymentRequestInput,
  EditPaymentRequestInput,
  RejectPaymentRequestInput,
} from '../../domain/fees/payment-requests.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut } from '../http/api-client';

export function createPaymentRequest(
  input: CreatePaymentRequestInput,
): Promise<Result<PaymentRequestApiResponse, AppError>> {
  return apiPost<PaymentRequestApiResponse>('/api/v1/fees/payment-requests', input);
}

export function listPaymentRequests(
  status?: string,
): Promise<Result<PaymentRequestListApiResponse, AppError>> {
  const parts: string[] = [];
  if (status) {
    parts.push(`status=${encodeURIComponent(status)}`);
  }
  const qs = parts.join('&');
  return apiGet<PaymentRequestListApiResponse>(
    `/api/v1/fees/payment-requests${qs ? `?${qs}` : ''}`,
  );
}

export function editPaymentRequest(
  requestId: string,
  input: EditPaymentRequestInput,
): Promise<Result<PaymentRequestApiResponse, AppError>> {
  return apiPut<PaymentRequestApiResponse>(`/api/v1/fees/payment-requests/${requestId}`, input);
}

export function cancelPaymentRequest(
  requestId: string,
): Promise<Result<PaymentRequestApiResponse, AppError>> {
  return apiPut<PaymentRequestApiResponse>(`/api/v1/fees/payment-requests/${requestId}/cancel`);
}

export function approvePaymentRequest(
  requestId: string,
): Promise<Result<PaymentRequestApiResponse, AppError>> {
  return apiPut<PaymentRequestApiResponse>(`/api/v1/fees/payment-requests/${requestId}/approve`);
}

export function rejectPaymentRequest(
  requestId: string,
  input: RejectPaymentRequestInput,
): Promise<Result<PaymentRequestApiResponse, AppError>> {
  return apiPut<PaymentRequestApiResponse>(
    `/api/v1/fees/payment-requests/${requestId}/reject`,
    input,
  );
}

export const paymentRequestsApi = {
  createPaymentRequest,
  editPaymentRequest,
  listPaymentRequests,
  cancelPaymentRequest,
  approvePaymentRequest,
  rejectPaymentRequest,
};
