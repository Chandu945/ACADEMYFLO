import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { DailyStaffReportResult } from '../../../domain/staff-attendance/staff-attendance.types';
import {
  staffDailyReportResponseSchema,
  type StaffDailyReportApiResponse,
} from '../../../domain/staff-attendance/staff-attendance.schemas';

export type GetStaffDailyReportApiPort = {
  getStaffDailyReport(date: string): Promise<Result<StaffDailyReportApiResponse, AppError>>;
};

export type GetStaffDailyReportDeps = {
  staffAttendanceApi: GetStaffDailyReportApiPort;
};

export async function getStaffDailyReportUseCase(
  deps: GetStaffDailyReportDeps,
  date: string,
): Promise<Result<DailyStaffReportResult, AppError>> {
  const result = await deps.staffAttendanceApi.getStaffDailyReport(date);

  if (!result.ok) {
    return result;
  }

  const parsed = staffDailyReportResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
