import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { HolidayItem } from '../../../domain/attendance/attendance.types';
import { holidayItemSchema } from '../../../domain/attendance/attendance.schemas';

export type RemoveHolidayApiPort = {
  removeHoliday(date: string): Promise<Result<HolidayItem, AppError>>;
};

export type RemoveHolidayDeps = {
  holidaysApi: RemoveHolidayApiPort;
};

export async function removeHolidayUseCase(
  deps: RemoveHolidayDeps,
  date: string,
): Promise<Result<HolidayItem, AppError>> {
  const result = await deps.holidaysApi.removeHoliday(date);

  if (!result.ok) {
    return result;
  }

  const parsed = holidayItemSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
