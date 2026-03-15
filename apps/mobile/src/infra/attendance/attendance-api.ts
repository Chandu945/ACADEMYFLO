import type { AttendanceStatus } from '../../domain/attendance/attendance.types';
import type {
  DailyAttendanceApiResponse,
  MarkAttendanceApiResponse,
  BulkSetAbsencesApiResponse,
  DailyReportApiResponse,
  MonthlySummaryApiResponse,
  StudentMonthlyDetailApiResponse,
  MonthDailyCountsApiResponse,
} from '../../domain/attendance/attendance.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';

export function getDailyAttendance(
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
  return apiGet<DailyAttendanceApiResponse>(`/api/v1/attendance/students?${parts.join('&')}`);
}

export function markAttendance(
  studentId: string,
  date: string,
  status: AttendanceStatus,
): Promise<Result<MarkAttendanceApiResponse, AppError>> {
  return apiPut<MarkAttendanceApiResponse>(
    `/api/v1/attendance/students/${studentId}?date=${encodeURIComponent(date)}`,
    { status },
  );
}

export function bulkSetAbsences(
  date: string,
  absentStudentIds: string[],
): Promise<Result<BulkSetAbsencesApiResponse, AppError>> {
  return apiPut<BulkSetAbsencesApiResponse>(`/api/v1/attendance/students/bulk?date=${encodeURIComponent(date)}`, {
    absentStudentIds,
  });
}

export function getDailyReport(date: string): Promise<Result<DailyReportApiResponse, AppError>> {
  return apiGet<DailyReportApiResponse>(`/api/v1/attendance/reports/daily?date=${encodeURIComponent(date)}`);
}

export function getMonthlySummary(
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
  return apiGet<MonthlySummaryApiResponse>(
    `/api/v1/attendance/reports/monthly/summary?${parts.join('&')}`,
  );
}

export function getStudentMonthlyDetail(
  studentId: string,
  month: string,
): Promise<Result<StudentMonthlyDetailApiResponse, AppError>> {
  return apiGet<StudentMonthlyDetailApiResponse>(
    `/api/v1/attendance/reports/monthly/student/${studentId}?month=${encodeURIComponent(month)}`,
  );
}

export function getMonthDailyCounts(
  month: string,
): Promise<Result<MonthDailyCountsApiResponse, AppError>> {
  return apiGet<MonthDailyCountsApiResponse>(
    `/api/v1/attendance/reports/month-daily-counts?month=${encodeURIComponent(month)}`,
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
