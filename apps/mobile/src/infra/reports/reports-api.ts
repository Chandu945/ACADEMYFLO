import type { MonthlyRevenueSummaryApiResponse } from '../../domain/reports/reports.schemas';
import type { StudentWiseDueListApiResponse } from '../../domain/reports/reports.schemas';
import type { MonthWiseDuesSummaryApiResponse } from '../../domain/reports/reports.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet } from '../http/api-client';

export function getMonthlyRevenue(
  month: string,
): Promise<Result<MonthlyRevenueSummaryApiResponse, AppError>> {
  return apiGet<MonthlyRevenueSummaryApiResponse>(`/api/v1/reports/monthly-revenue?month=${month}`);
}

export function getStudentWiseDues(
  month: string,
): Promise<Result<StudentWiseDueListApiResponse, AppError>> {
  return apiGet<StudentWiseDueListApiResponse>(`/api/v1/reports/student-wise-dues?month=${month}`);
}

export function getMonthWiseDues(
  month: string,
): Promise<Result<MonthWiseDuesSummaryApiResponse, AppError>> {
  return apiGet<MonthWiseDuesSummaryApiResponse>(`/api/v1/reports/month-wise-dues?month=${month}`);
}

export function getRevenueExportUrl(month: string): string {
  return `/api/v1/reports/revenue/export.pdf?month=${month}`;
}

export function getPendingDuesExportUrl(month: string): string {
  return `/api/v1/reports/dues/pending/export.pdf?month=${month}`;
}

export const reportsApi = {
  getMonthlyRevenue,
  getStudentWiseDues,
  getMonthWiseDues,
  getRevenueExportUrl,
  getPendingDuesExportUrl,
};
