import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StudentWiseDueItem } from '../../../domain/reports/reports.types';
import {
  studentWiseDuesPaginatedSchema,
  type StudentWiseDuesPaginatedApiResponse,
} from '../../../domain/reports/reports.schemas';

export type GetStudentWiseDuesApiPort = {
  getStudentWiseDues(
    month: string,
    page: number,
    pageSize: number,
  ): Promise<Result<StudentWiseDuesPaginatedApiResponse, AppError>>;
};

export type GetStudentWiseDuesDeps = {
  reportsApi: GetStudentWiseDuesApiPort;
};

export interface StudentWiseDuesPaginatedResult {
  items: StudentWiseDueItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function getStudentWiseDuesUseCase(
  deps: GetStudentWiseDuesDeps,
  month: string,
  page: number,
  pageSize: number,
): Promise<Result<StudentWiseDuesPaginatedResult, AppError>> {
  const result = await deps.reportsApi.getStudentWiseDues(month, page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = studentWiseDuesPaginatedSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
