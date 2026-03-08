import type { OwnerDashboardRange, MonthlyChartData, BirthdaysResult } from '../../domain/dashboard/dashboard.types';
import type { OwnerDashboardApiPayload } from '../../domain/dashboard/dashboard.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet } from '../http/api-client';

function buildPath(range: OwnerDashboardRange): string {
  const base = '/api/v1/dashboard/owner';
  if (range.mode === 'preset') {
    return `${base}?preset=${range.preset}`;
  }
  return `${base}?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

export function getOwnerDashboard(
  range: OwnerDashboardRange,
): Promise<Result<OwnerDashboardApiPayload, AppError>> {
  return apiGet<OwnerDashboardApiPayload>(buildPath(range));
}

export function getMonthlyChart(
  year: number,
): Promise<Result<MonthlyChartData, AppError>> {
  return apiGet<MonthlyChartData>(`/api/v1/dashboard/monthly-chart?year=${year}`);
}

export function getBirthdays(
  scope: 'today' | 'month',
): Promise<Result<BirthdaysResult, AppError>> {
  return apiGet<BirthdaysResult>(`/api/v1/dashboard/birthdays?scope=${scope}`);
}
