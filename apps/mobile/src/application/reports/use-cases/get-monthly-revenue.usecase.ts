import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { MonthlyRevenueSummary } from '../../../domain/reports/reports.types';
import {
  monthlyRevenueSummarySchema,
  type MonthlyRevenueSummaryApiResponse,
} from '../../../domain/reports/reports.schemas';

export type GetMonthlyRevenueApiPort = {
  getMonthlyRevenue(month: string): Promise<Result<MonthlyRevenueSummaryApiResponse, AppError>>;
};

export type GetMonthlyRevenueDeps = {
  reportsApi: GetMonthlyRevenueApiPort;
};

export async function getMonthlyRevenueUseCase(
  deps: GetMonthlyRevenueDeps,
  month: string,
): Promise<Result<MonthlyRevenueSummary, AppError>> {
  const result = await deps.reportsApi.getMonthlyRevenue(month);

  if (!result.ok) {
    return result;
  }

  const parsed = monthlyRevenueSummarySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
