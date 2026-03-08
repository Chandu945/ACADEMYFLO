import type { StaffAttendanceStatus } from '../../domain/staff-attendance/staff-attendance.types';
import type {
  DailyStaffAttendanceApiResponse,
  MarkStaffAttendanceApiResponse,
  StaffDailyReportApiResponse,
  MonthlyStaffSummaryApiResponse,
} from '../../domain/staff-attendance/staff-attendance.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';

export function getDailyStaffAttendance(
  date: string,
  page: number,
  pageSize: number,
): Promise<Result<DailyStaffAttendanceApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`date=${encodeURIComponent(date)}`);
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  return apiGet<DailyStaffAttendanceApiResponse>(`/api/v1/staff-attendance?${parts.join('&')}`);
}

export function markStaffAttendance(
  staffUserId: string,
  date: string,
  status: StaffAttendanceStatus,
): Promise<Result<MarkStaffAttendanceApiResponse, AppError>> {
  return apiPut<MarkStaffAttendanceApiResponse>(
    `/api/v1/staff-attendance/${staffUserId}?date=${encodeURIComponent(date)}`,
    { status },
  );
}

export function getStaffDailyReport(
  date: string,
): Promise<Result<StaffDailyReportApiResponse, AppError>> {
  return apiGet<StaffDailyReportApiResponse>(
    `/api/v1/staff-attendance/reports/daily?date=${encodeURIComponent(date)}`,
  );
}

export function getStaffMonthlySummary(
  month: string,
  page: number,
  pageSize: number,
): Promise<Result<MonthlyStaffSummaryApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`month=${encodeURIComponent(month)}`);
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  return apiGet<MonthlyStaffSummaryApiResponse>(
    `/api/v1/staff-attendance/reports/monthly?${parts.join('&')}`,
  );
}

export const staffAttendanceApi = {
  getDailyStaffAttendance,
  markStaffAttendance,
  getStaffDailyReport,
  getStaffMonthlySummary,
};
