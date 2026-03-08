import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StudentWiseDueItem } from '../../../domain/reports/reports.types';
import {
  studentWiseDueListSchema,
  type StudentWiseDueListApiResponse,
} from '../../../domain/reports/reports.schemas';

export type GetStudentWiseDuesApiPort = {
  getStudentWiseDues(month: string): Promise<Result<StudentWiseDueListApiResponse, AppError>>;
};

export type GetStudentWiseDuesDeps = {
  reportsApi: GetStudentWiseDuesApiPort;
};

export async function getStudentWiseDuesUseCase(
  deps: GetStudentWiseDuesDeps,
  month: string,
): Promise<Result<StudentWiseDueItem[], AppError>> {
  const result = await deps.reportsApi.getStudentWiseDues(month);

  if (!result.ok) {
    return result;
  }

  const parsed = studentWiseDueListSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
