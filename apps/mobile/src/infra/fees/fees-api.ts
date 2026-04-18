import type { FeeDueListApiResponse, FeeDuePaginatedApiResponse } from '../../domain/fees/fees.schemas';
import type { FeeDueItem } from '../../domain/fees/fees.types';
import type { OverdueStudentsResult } from '../../domain/fees/overdue.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';

export function listUnpaidDues(
  month: string,
  page: number = 1,
  pageSize: number = 20,
  batchId?: string,
): Promise<Result<FeeDuePaginatedApiResponse, AppError>> {
  const parts = [`month=${encodeURIComponent(month)}`, `page=${page}`, `pageSize=${pageSize}`];
  if (batchId) parts.push(`batchId=${encodeURIComponent(batchId)}`);
  return apiGet<FeeDuePaginatedApiResponse>(`/api/v1/fees/dues?${parts.join('&')}`);
}

export function listPaidDues(month: string, batchId?: string): Promise<Result<FeeDueListApiResponse, AppError>> {
  const parts = [`month=${encodeURIComponent(month)}`];
  if (batchId) parts.push(`batchId=${encodeURIComponent(batchId)}`);
  return apiGet<FeeDueListApiResponse>(`/api/v1/fees/paid?${parts.join('&')}`);
}

export function getStudentFees(
  studentId: string,
  from: string,
  to: string,
): Promise<Result<FeeDueListApiResponse, AppError>> {
  return apiGet<FeeDueListApiResponse>(`/api/v1/fees/students/${studentId}?from=${from}&to=${to}`);
}

export function markFeePaid(
  studentId: string,
  month: string,
  paymentLabel?: string,
): Promise<Result<FeeDueItem, AppError>> {
  return apiPut<FeeDueItem>(`/api/v1/fees/students/${studentId}/${month}/pay`, paymentLabel ? { paymentLabel } : undefined);
}

export function getOverdueStudents(): Promise<Result<OverdueStudentsResult, AppError>> {
  return apiGet<OverdueStudentsResult>('/api/v1/fees/overdue');
}

export const feesApi = { listUnpaidDues, listPaidDues, getStudentFees, markFeePaid, getOverdueStudents };
