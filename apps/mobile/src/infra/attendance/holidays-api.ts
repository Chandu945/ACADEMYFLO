import type { HolidaysApiResponse } from '../../domain/attendance/attendance.schemas';
import type { HolidayItem } from '../../domain/attendance/attendance.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiDelete } from '../http/api-client';

export function getHolidays(month: string): Promise<Result<HolidaysApiResponse, AppError>> {
  return apiGet<HolidaysApiResponse>(`/api/v1/attendance/holidays?month=${month}`);
}

export function declareHoliday(
  date: string,
  reason?: string,
): Promise<Result<HolidayItem, AppError>> {
  return apiPost<HolidayItem>('/api/v1/attendance/holidays', {
    date,
    ...(reason ? { reason } : {}),
  });
}

export function removeHoliday(date: string): Promise<Result<HolidayItem, AppError>> {
  return apiDelete<HolidayItem>(`/api/v1/attendance/holidays/${date}`);
}

export const holidaysApi = { getHolidays, declareHoliday, removeHoliday };
