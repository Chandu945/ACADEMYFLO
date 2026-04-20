import type { OwnerDashboardRange, MonthlyChartData, BirthdaysResult } from '../../domain/dashboard/dashboard.types';
import {
  ownerDashboardApiSchema,
  monthlyChartDataSchema,
  birthdaysResultSchema,
  type OwnerDashboardApiPayload,
} from '../../domain/dashboard/dashboard.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same validateResponse pattern as student/staff/enquiry/event/expense APIs.
// Backend drift surfaces as a clear VALIDATION instead of `undefined.foo`
// crashes deep in dashboard widgets.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[dashboardApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

function buildPath(range: OwnerDashboardRange): string {
  const base = '/api/v1/dashboard/owner';
  if (range.mode === 'preset') {
    return `${base}?preset=${range.preset}`;
  }
  return `${base}?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

export async function getOwnerDashboard(
  range: OwnerDashboardRange,
): Promise<Result<OwnerDashboardApiPayload, AppError>> {
  const result = await apiGet<unknown>(buildPath(range));
  return validateResponse(ownerDashboardApiSchema, result, 'getOwnerDashboard');
}

export async function getMonthlyChart(
  year: number,
): Promise<Result<MonthlyChartData, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/dashboard/monthly-chart?year=${year}`);
  return validateResponse(
    monthlyChartDataSchema as unknown as ZodSchema<MonthlyChartData>,
    result,
    'getMonthlyChart',
  );
}

export async function getBirthdays(
  scope: 'today' | 'month',
): Promise<Result<BirthdaysResult, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/dashboard/birthdays?scope=${scope}`);
  return validateResponse(
    birthdaysResultSchema as unknown as ZodSchema<BirthdaysResult>,
    result,
    'getBirthdays',
  );
}
