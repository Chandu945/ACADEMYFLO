import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StudentListItem, StudentListFilters } from '../../../domain/student/student.types';
import {
  studentListResponseSchema,
  type StudentListApiResponse,
} from '../../../domain/student/student.schemas';

export type StudentApiPort = {
  listStudents(
    filters: StudentListFilters,
    page: number,
    pageSize: number,
  ): Promise<Result<StudentListApiResponse, AppError>>;
};

export type ListStudentsDeps = {
  studentApi: StudentApiPort;
};

export type ListStudentsResult = {
  items: StudentListItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listStudentsUseCase(
  deps: ListStudentsDeps,
  filters: StudentListFilters,
  page: number,
  pageSize: number,
): Promise<Result<ListStudentsResult, AppError>> {
  const result = await deps.studentApi.listStudents(filters, page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = studentListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
