import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { HolidayItem } from '../../../domain/attendance/attendance.types';
import {
  holidaysResponseSchema,
  type HolidaysApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type GetHolidaysApiPort = {
  getHolidays(month: string): Promise<Result<HolidaysApiResponse, AppError>>;
};

export type GetHolidaysDeps = {
  holidaysApi: GetHolidaysApiPort;
};

export async function getHolidaysUseCase(
  deps: GetHolidaysDeps,
  month: string,
): Promise<Result<HolidayItem[], AppError>> {
  const result = await deps.holidaysApi.getHolidays(month);

  if (!result.ok) {
    return result;
  }

  const parsed = holidaysResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
