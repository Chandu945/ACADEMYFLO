import type {
  ChildSummary,
  ChildAttendanceSummary,
  ChildFeeDue,
  InitiateFeePaymentResponse,
  FeePaymentStatusResponse,
  ReceiptInfo,
  ParentProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AcademyInfo,
  PaymentHistoryItem,
} from '../../domain/parent/parent.types';
import {
  childrenListSchema,
  childAttendanceSummarySchema,
  childFeesListSchema,
  initiateFeePaymentResponseSchema,
  feePaymentStatusResponseSchema,
  receiptSchema,
  parentProfileSchema,
  academyInfoSchema,
  paymentHistoryListSchema,
} from '../../domain/parent/parent.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same validateResponse pattern as student/staff/enquiry/expense/event APIs.
// Backend drift surfaces as a clear VALIDATION error instead of
// `undefined.foo` crashes deep in parent screens.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[parentApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function getMyChildren(): Promise<Result<ChildSummary[], AppError>> {
  const result = await apiGet<unknown>('/api/v1/parent/children');
  return validateResponse(
    childrenListSchema as unknown as ZodSchema<ChildSummary[]>,
    result,
    'getMyChildren',
  );
}

export async function getChildAttendance(
  studentId: string,
  month: string,
): Promise<Result<ChildAttendanceSummary, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/parent/children/${encodeURIComponent(studentId)}/attendance?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(
    childAttendanceSummarySchema as unknown as ZodSchema<ChildAttendanceSummary>,
    result,
    'getChildAttendance',
  );
}

export async function getChildFees(
  studentId: string,
  from: string,
  to: string,
): Promise<Result<ChildFeeDue[], AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/parent/children/${encodeURIComponent(studentId)}/fees?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return validateResponse(
    childFeesListSchema as unknown as ZodSchema<ChildFeeDue[]>,
    result,
    'getChildFees',
  );
}

export async function initiateFeePayment(
  feeDueId: string,
): Promise<Result<InitiateFeePaymentResponse, AppError>> {
  const result = await apiPost<unknown>('/api/v1/parent/fee-payments/initiate', { feeDueId });
  return validateResponse(
    initiateFeePaymentResponseSchema as unknown as ZodSchema<InitiateFeePaymentResponse>,
    result,
    'initiateFeePayment',
  );
}

export async function getFeePaymentStatus(
  orderId: string,
): Promise<Result<FeePaymentStatusResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/parent/fee-payments/${encodeURIComponent(orderId)}/status`,
  );
  return validateResponse(
    feePaymentStatusResponseSchema as unknown as ZodSchema<FeePaymentStatusResponse>,
    result,
    'getFeePaymentStatus',
  );
}

export async function getReceipt(
  feeDueId: string,
): Promise<Result<ReceiptInfo, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/parent/receipts/${encodeURIComponent(feeDueId)}`);
  return validateResponse(
    receiptSchema as unknown as ZodSchema<ReceiptInfo>,
    result,
    'getReceipt',
  );
}

export async function getParentProfile(): Promise<Result<ParentProfile, AppError>> {
  const result = await apiGet<unknown>('/api/v1/parent/profile');
  return validateResponse(
    parentProfileSchema as unknown as ZodSchema<ParentProfile>,
    result,
    'getParentProfile',
  );
}

export async function updateParentProfile(
  req: UpdateProfileRequest,
): Promise<Result<ParentProfile, AppError>> {
  const result = await apiPut<unknown>('/api/v1/parent/profile', req);
  return validateResponse(
    parentProfileSchema as unknown as ZodSchema<ParentProfile>,
    result,
    'updateParentProfile',
  );
}

export function changePassword(
  req: ChangePasswordRequest,
): Promise<Result<void, AppError>> {
  return apiPut<void>('/api/v1/parent/change-password', req);
}

export async function getAcademyInfo(): Promise<Result<AcademyInfo, AppError>> {
  const result = await apiGet<unknown>('/api/v1/parent/academy');
  return validateResponse(
    academyInfoSchema as unknown as ZodSchema<AcademyInfo>,
    result,
    'getAcademyInfo',
  );
}

export async function getPaymentHistory(): Promise<Result<PaymentHistoryItem[], AppError>> {
  const result = await apiGet<unknown>('/api/v1/parent/payment-history');
  return validateResponse(
    paymentHistoryListSchema as unknown as ZodSchema<PaymentHistoryItem[]>,
    result,
    'getPaymentHistory',
  );
}

export const parentApi = {
  getMyChildren,
  getChildAttendance,
  getChildFees,
  initiateFeePayment,
  getFeePaymentStatus,
  getReceipt,
  getParentProfile,
  updateParentProfile,
  changePassword,
  getAcademyInfo,
  getPaymentHistory,
};
