import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StudentMonthlyDetail } from '../../../domain/attendance/attendance.types';
import {
  studentMonthlyDetailResponseSchema,
  type StudentMonthlyDetailApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type GetStudentMonthlyDetailApiPort = {
  getStudentMonthlyDetail(
    studentId: string,
    month: string,
  ): Promise<Result<StudentMonthlyDetailApiResponse, AppError>>;
};

export type GetStudentMonthlyDetailDeps = {
  attendanceApi: GetStudentMonthlyDetailApiPort;
};

export async function getStudentMonthlyDetailUseCase(
  deps: GetStudentMonthlyDetailDeps,
  studentId: string,
  month: string,
): Promise<Result<StudentMonthlyDetail, AppError>> {
  const result = await deps.attendanceApi.getStudentMonthlyDetail(studentId, month);

  if (!result.ok) {
    return result;
  }

  const parsed = studentMonthlyDetailResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) console.error('[getStudentMonthlyDetailUseCase] Schema parse failed:', parsed.error.issues);
    return err({ code: 'UNKNOWN', message: 'Failed to load attendance data. Please try again.' });
  }

  return ok(parsed.data);
}
