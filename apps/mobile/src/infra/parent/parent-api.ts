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
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut } from '../http/api-client';

export function getMyChildren(): Promise<Result<ChildSummary[], AppError>> {
  return apiGet<ChildSummary[]>('/api/v1/parent/children');
}

export function getChildAttendance(
  studentId: string,
  month: string,
): Promise<Result<ChildAttendanceSummary, AppError>> {
  const parts: string[] = [];
  parts.push(`month=${encodeURIComponent(month)}`);
  return apiGet<ChildAttendanceSummary>(
    `/api/v1/parent/children/${encodeURIComponent(studentId)}/attendance?${parts.join('&')}`,
  );
}

export function getChildFees(
  studentId: string,
  from: string,
  to: string,
): Promise<Result<ChildFeeDue[], AppError>> {
  const parts: string[] = [];
  parts.push(`from=${encodeURIComponent(from)}`);
  parts.push(`to=${encodeURIComponent(to)}`);
  return apiGet<ChildFeeDue[]>(
    `/api/v1/parent/children/${encodeURIComponent(studentId)}/fees?${parts.join('&')}`,
  );
}

export function initiateFeePayment(
  feeDueId: string,
): Promise<Result<InitiateFeePaymentResponse, AppError>> {
  return apiPost<InitiateFeePaymentResponse>('/api/v1/parent/fee-payments/initiate', { feeDueId });
}

export function getFeePaymentStatus(
  orderId: string,
): Promise<Result<FeePaymentStatusResponse, AppError>> {
  return apiGet<FeePaymentStatusResponse>(
    `/api/v1/parent/fee-payments/${encodeURIComponent(orderId)}/status`,
  );
}

export function getReceipt(
  feeDueId: string,
): Promise<Result<ReceiptInfo, AppError>> {
  return apiGet<ReceiptInfo>(
    `/api/v1/parent/receipts/${encodeURIComponent(feeDueId)}`,
  );
}

export function getParentProfile(): Promise<Result<ParentProfile, AppError>> {
  return apiGet<ParentProfile>('/api/v1/parent/profile');
}

export function updateParentProfile(
  req: UpdateProfileRequest,
): Promise<Result<ParentProfile, AppError>> {
  return apiPut<ParentProfile>('/api/v1/parent/profile', req);
}

export function changePassword(
  req: ChangePasswordRequest,
): Promise<Result<void, AppError>> {
  return apiPut<void>('/api/v1/parent/change-password', req);
}

export function getAcademyInfo(): Promise<Result<AcademyInfo, AppError>> {
  return apiGet<AcademyInfo>('/api/v1/parent/academy');
}

export function getPaymentHistory(): Promise<Result<PaymentHistoryItem[], AppError>> {
  return apiGet<PaymentHistoryItem[]>('/api/v1/parent/payment-history');
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
