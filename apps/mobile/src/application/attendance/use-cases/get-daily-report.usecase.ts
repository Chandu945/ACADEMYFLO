import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { DailyReportResult } from '../../../domain/attendance/attendance.types';
import {
  dailyReportResponseSchema,
  type DailyReportApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type GetDailyReportApiPort = {
  getDailyReport(date: string): Promise<Result<DailyReportApiResponse, AppError>>;
};

export type GetDailyReportDeps = {
  attendanceApi: GetDailyReportApiPort;
};

export async function getDailyReportUseCase(
  deps: GetDailyReportDeps,
  date: string,
): Promise<Result<DailyReportResult, AppError>> {
  const result = await deps.attendanceApi.getDailyReport(date);

  if (!result.ok) {
    return result;
  }

  const parsed = dailyReportResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[getDailyReportUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Failed to load report. Please try again.' });
  }

  return ok(parsed.data);
}
