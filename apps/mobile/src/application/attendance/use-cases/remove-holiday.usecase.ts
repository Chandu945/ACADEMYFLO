import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok } from '../../../domain/common/result';

export type RemoveHolidayApiPort = {
  removeHoliday(date: string): Promise<Result<unknown, AppError>>;
};

export type RemoveHolidayDeps = {
  holidaysApi: RemoveHolidayApiPort;
};

export async function removeHolidayUseCase(
  deps: RemoveHolidayDeps,
  date: string,
): Promise<Result<{ date: string }, AppError>> {
  const result = await deps.holidaysApi.removeHoliday(date);

  if (!result.ok) {
    return result;
  }

  // API returns { date } — just confirm success, no full validation needed
  return ok({ date });
}
