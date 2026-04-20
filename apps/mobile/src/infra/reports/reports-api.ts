import {
  monthlyRevenueSummarySchema,
  studentWiseDuesPaginatedSchema,
  monthWiseDuesSummarySchema,
  type MonthlyRevenueSummaryApiResponse,
  type StudentWiseDuesPaginatedApiResponse,
  type MonthWiseDuesSummaryApiResponse,
} from '../../domain/reports/reports.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet } from '../http/api-client';
import type { ZodSchema } from 'zod';

function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[reportsApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function getMonthlyRevenue(
  month: string,
): Promise<Result<MonthlyRevenueSummaryApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/reports/monthly-revenue?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(monthlyRevenueSummarySchema, result, 'getMonthlyRevenue');
}

export async function getStudentWiseDues(
  month: string,
  page: number,
  pageSize: number,
): Promise<Result<StudentWiseDuesPaginatedApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/reports/student-wise-dues?month=${encodeURIComponent(month)}&page=${page}&pageSize=${pageSize}`,
  );
  return validateResponse(studentWiseDuesPaginatedSchema, result, 'getStudentWiseDues');
}

export async function getMonthWiseDues(
  month: string,
): Promise<Result<MonthWiseDuesSummaryApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/reports/month-wise-dues?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(monthWiseDuesSummarySchema, result, 'getMonthWiseDues');
}

export function getRevenueExportUrl(month: string): string {
  return `/api/v1/reports/revenue/export.pdf?month=${encodeURIComponent(month)}`;
}

export function getPendingDuesExportUrl(month: string): string {
  return `/api/v1/reports/dues/pending/export.pdf?month=${encodeURIComponent(month)}`;
}

export const reportsApi = {
  getMonthlyRevenue,
  getStudentWiseDues,
  getMonthWiseDues,
  getRevenueExportUrl,
  getPendingDuesExportUrl,
};
