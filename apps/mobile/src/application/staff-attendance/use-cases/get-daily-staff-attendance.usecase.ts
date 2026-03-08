import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { DailyStaffAttendancePage } from '../../../domain/staff-attendance/staff-attendance.types';
import {
  dailyStaffAttendanceResponseSchema,
  type DailyStaffAttendanceApiResponse,
} from '../../../domain/staff-attendance/staff-attendance.schemas';

export type DailyStaffAttendanceApiPort = {
  getDailyStaffAttendance(
    date: string,
    page: number,
    pageSize: number,
  ): Promise<Result<DailyStaffAttendanceApiResponse, AppError>>;
};

export type GetDailyStaffAttendanceDeps = {
  staffAttendanceApi: DailyStaffAttendanceApiPort;
};

export async function getDailyStaffAttendanceUseCase(
  deps: GetDailyStaffAttendanceDeps,
  date: string,
  page: number,
  pageSize: number,
): Promise<Result<DailyStaffAttendancePage, AppError>> {
  const result = await deps.staffAttendanceApi.getDailyStaffAttendance(date, page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = dailyStaffAttendanceResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok({
    date: parsed.data.date,
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
