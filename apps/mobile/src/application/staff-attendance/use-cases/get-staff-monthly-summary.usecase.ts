import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { MonthlyStaffSummaryPage } from '../../../domain/staff-attendance/staff-attendance.types';
import {
  monthlyStaffSummaryResponseSchema,
  type MonthlyStaffSummaryApiResponse,
} from '../../../domain/staff-attendance/staff-attendance.schemas';

export type GetStaffMonthlySummaryApiPort = {
  getStaffMonthlySummary(
    month: string,
    page: number,
    pageSize: number,
  ): Promise<Result<MonthlyStaffSummaryApiResponse, AppError>>;
};

export type GetStaffMonthlySummaryDeps = {
  staffAttendanceApi: GetStaffMonthlySummaryApiPort;
};

export async function getStaffMonthlySummaryUseCase(
  deps: GetStaffMonthlySummaryDeps,
  month: string,
  page: number,
  pageSize: number,
): Promise<Result<MonthlyStaffSummaryPage, AppError>> {
  const result = await deps.staffAttendanceApi.getStaffMonthlySummary(month, page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = monthlyStaffSummaryResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
