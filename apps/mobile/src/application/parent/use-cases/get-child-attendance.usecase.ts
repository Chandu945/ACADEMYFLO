import type { ChildAttendanceSummary } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { childAttendanceSummarySchema } from '../../../domain/parent/parent.schemas';

export type GetChildAttendanceApiPort = {
  getChildAttendance(studentId: string, month: string): Promise<Result<ChildAttendanceSummary, AppError>>;
};

export async function getChildAttendanceUseCase(
  deps: { parentApi: GetChildAttendanceApiPort },
  studentId: string,
  month: string,
): Promise<Result<ChildAttendanceSummary, AppError>> {
  const result = await deps.parentApi.getChildAttendance(studentId, month);
  if (!result.ok) return result;

  const parsed = childAttendanceSummarySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
