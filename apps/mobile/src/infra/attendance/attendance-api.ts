import type { AttendanceStatus } from '../../domain/attendance/attendance.types';
import {
  dailyAttendanceResponseSchema,
  markAttendanceResponseSchema,
  bulkSetAbsencesResponseSchema,
  dailyReportResponseSchema,
  monthlySummaryResponseSchema,
  studentMonthlyDetailResponseSchema,
  monthDailyCountsResponseSchema,
  type DailyAttendanceApiResponse,
  type MarkAttendanceApiResponse,
  type BulkSetAbsencesApiResponse,
  type DailyReportApiResponse,
  type MonthlySummaryApiResponse,
  type StudentMonthlyDetailApiResponse,
  type MonthDailyCountsApiResponse,
} from '../../domain/attendance/attendance.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';
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
      console.error(`[attendanceApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function getDailyAttendance(
  date: string,
  page: number,
  pageSize: number,
  batchId?: string,
  search?: string,
): Promise<Result<DailyAttendanceApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`date=${encodeURIComponent(date)}`);
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (batchId) parts.push(`batchId=${encodeURIComponent(batchId)}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  const result = await apiGet<unknown>(`/api/v1/attendance/students?${parts.join('&')}`);
  return validateResponse(
    dailyAttendanceResponseSchema as unknown as ZodSchema<DailyAttendanceApiResponse>,
    result,
    'getDailyAttendance',
  );
}

export async function markAttendance(
  studentId: string,
  date: string,
  status: AttendanceStatus,
): Promise<Result<MarkAttendanceApiResponse, AppError>> {
  const result = await apiPut<unknown>(
    `/api/v1/attendance/students/${studentId}?date=${encodeURIComponent(date)}`,
    { status },
  );
  return validateResponse(
    markAttendanceResponseSchema as unknown as ZodSchema<MarkAttendanceApiResponse>,
    result,
    'markAttendance',
  );
}

export async function bulkSetAbsences(
  date: string,
  absentStudentIds: string[],
): Promise<Result<BulkSetAbsencesApiResponse, AppError>> {
  const result = await apiPut<unknown>(
    `/api/v1/attendance/students/bulk?date=${encodeURIComponent(date)}`,
    { absentStudentIds },
  );
  return validateResponse(
    bulkSetAbsencesResponseSchema as unknown as ZodSchema<BulkSetAbsencesApiResponse>,
    result,
    'bulkSetAbsences',
  );
}

export async function getDailyReport(date: string): Promise<Result<DailyReportApiResponse, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/attendance/reports/daily?date=${encodeURIComponent(date)}`);
  return validateResponse(
    dailyReportResponseSchema as unknown as ZodSchema<DailyReportApiResponse>,
    result,
    'getDailyReport',
  );
}

export async function getMonthlySummary(
  month: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<MonthlySummaryApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`month=${encodeURIComponent(month)}`);
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  const result = await apiGet<unknown>(`/api/v1/attendance/reports/monthly/summary?${parts.join('&')}`);
  return validateResponse(
    monthlySummaryResponseSchema as unknown as ZodSchema<MonthlySummaryApiResponse>,
    result,
    'getMonthlySummary',
  );
}

export async function getStudentMonthlyDetail(
  studentId: string,
  month: string,
): Promise<Result<StudentMonthlyDetailApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/attendance/reports/monthly/student/${studentId}?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(
    studentMonthlyDetailResponseSchema as unknown as ZodSchema<StudentMonthlyDetailApiResponse>,
    result,
    'getStudentMonthlyDetail',
  );
}

export async function getMonthDailyCounts(
  month: string,
): Promise<Result<MonthDailyCountsApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/attendance/reports/month-daily-counts?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(
    monthDailyCountsResponseSchema as unknown as ZodSchema<MonthDailyCountsApiResponse>,
    result,
    'getMonthDailyCounts',
  );
}

export const attendanceApi = {
  getDailyAttendance,
  markAttendance,
  bulkSetAbsences,
  getDailyReport,
  getMonthlySummary,
  getStudentMonthlyDetail,
  getMonthDailyCounts,
};
