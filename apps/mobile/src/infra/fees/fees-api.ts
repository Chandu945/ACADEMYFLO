import type { FeeDueListApiResponse, FeeDuePaginatedApiResponse } from '../../domain/fees/fees.schemas';
import type { FeeDueItem } from '../../domain/fees/fees.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';

export function listUnpaidDues(
  month: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<Result<FeeDuePaginatedApiResponse, AppError>> {
  return apiGet<FeeDuePaginatedApiResponse>(
    `/api/v1/fees/dues?month=${month}&page=${page}&pageSize=${pageSize}`,
  );
}

export function listPaidDues(month: string): Promise<Result<FeeDueListApiResponse, AppError>> {
  return apiGet<FeeDueListApiResponse>(`/api/v1/fees/paid?month=${month}`);
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
): Promise<Result<FeeDueItem, AppError>> {
  return apiPut<FeeDueItem>(`/api/v1/fees/students/${studentId}/${month}/pay`);
}

export const feesApi = { listUnpaidDues, listPaidDues, getStudentFees, markFeePaid };
