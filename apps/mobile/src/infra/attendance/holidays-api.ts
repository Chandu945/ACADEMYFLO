import { z } from 'zod';
import {
  holidayItemSchema,
  holidaysResponseSchema,
  type HolidaysApiResponse,
} from '../../domain/attendance/attendance.schemas';
import type { HolidayItem } from '../../domain/attendance/attendance.types';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiDelete } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Remove endpoint returns just the deleted date — the API doesn't send back
// the full holiday record (it's been deleted) so we validate only what we get.
const removeHolidayResponseSchema = z.object({ date: z.string() });

// Runtime-validate so a backend drift (missing field, wrong type) surfaces as
// a clear VALIDATION rather than a silent undefined deep in the UI.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[holidaysApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function getHolidays(
  month: string,
): Promise<Result<HolidaysApiResponse, AppError>> {
  const result = await apiGet<unknown>(
    `/api/v1/attendance/holidays?month=${encodeURIComponent(month)}`,
  );
  return validateResponse(holidaysResponseSchema, result, 'getHolidays');
}

export async function declareHoliday(
  date: string,
  reason?: string,
): Promise<Result<HolidayItem, AppError>> {
  const result = await apiPost<unknown>('/api/v1/attendance/holidays', {
    date,
    ...(reason ? { reason } : {}),
  });
  return validateResponse(
    holidayItemSchema as unknown as ZodSchema<HolidayItem>,
    result,
    'declareHoliday',
  );
}

export async function removeHoliday(
  date: string,
): Promise<Result<{ date: string }, AppError>> {
  const result = await apiDelete<unknown>(
    `/api/v1/attendance/holidays/${encodeURIComponent(date)}`,
  );
  return validateResponse(removeHolidayResponseSchema, result, 'removeHoliday');
}

export const holidaysApi = { getHolidays, declareHoliday, removeHoliday };
