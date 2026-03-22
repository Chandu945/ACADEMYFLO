import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { MonthlySummaryPage } from '../../../domain/attendance/attendance.types';
import {
  monthlySummaryResponseSchema,
  type MonthlySummaryApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type GetMonthlySummaryApiPort = {
  getMonthlySummary(
    month: string,
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<Result<MonthlySummaryApiResponse, AppError>>;
};

export type GetMonthlySummaryDeps = {
  attendanceApi: GetMonthlySummaryApiPort;
};

export async function getMonthlySummaryUseCase(
  deps: GetMonthlySummaryDeps,
  month: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<MonthlySummaryPage, AppError>> {
  const result = await deps.attendanceApi.getMonthlySummary(month, page, pageSize, search);

  if (!result.ok) {
    return result;
  }

  const parsed = monthlySummaryResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[getMonthlySummaryUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Failed to load summary. Please try again.' });
  }

  return ok({
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
