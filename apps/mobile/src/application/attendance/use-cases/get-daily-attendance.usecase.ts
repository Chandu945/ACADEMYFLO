import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { DailyAttendancePage } from '../../../domain/attendance/attendance.types';
import {
  dailyAttendanceResponseSchema,
  type DailyAttendanceApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type DailyAttendanceApiPort = {
  getDailyAttendance(
    date: string,
    page: number,
    pageSize: number,
    batchId?: string,
    search?: string,
  ): Promise<Result<DailyAttendanceApiResponse, AppError>>;
};

export type GetDailyAttendanceDeps = {
  attendanceApi: DailyAttendanceApiPort;
};

export async function getDailyAttendanceUseCase(
  deps: GetDailyAttendanceDeps,
  date: string,
  page: number,
  pageSize: number,
  batchId?: string,
  search?: string,
): Promise<Result<DailyAttendancePage, AppError>> {
  const result = await deps.attendanceApi.getDailyAttendance(date, page, pageSize, batchId, search);

  if (!result.ok) {
    return result;
  }

  const parsed = dailyAttendanceResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    date: parsed.data.date,
    isHoliday: parsed.data.isHoliday,
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
