import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { HolidayItem } from '../../../domain/attendance/attendance.types';
import { holidayItemSchema } from '../../../domain/attendance/attendance.schemas';

export type DeclareHolidayApiPort = {
  declareHoliday(date: string, reason?: string): Promise<Result<HolidayItem, AppError>>;
};

export type DeclareHolidayDeps = {
  holidaysApi: DeclareHolidayApiPort;
};

export async function declareHolidayUseCase(
  deps: DeclareHolidayDeps,
  date: string,
  reason?: string,
): Promise<Result<HolidayItem, AppError>> {
  const result = await deps.holidaysApi.declareHoliday(date, reason);

  if (!result.ok) {
    return result;
  }

  const parsed = holidayItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
