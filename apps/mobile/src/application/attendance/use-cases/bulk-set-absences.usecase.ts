import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { BulkSetAbsencesResult } from '../../../domain/attendance/attendance.types';
import {
  bulkSetAbsencesResponseSchema,
  type BulkSetAbsencesApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type BulkSetAbsencesApiPort = {
  bulkSetAbsences(
    date: string,
    absentStudentIds: string[],
  ): Promise<Result<BulkSetAbsencesApiResponse, AppError>>;
};

export type BulkSetAbsencesDeps = {
  attendanceApi: BulkSetAbsencesApiPort;
};

export async function bulkSetAbsencesUseCase(
  deps: BulkSetAbsencesDeps,
  date: string,
  absentStudentIds: string[],
): Promise<Result<BulkSetAbsencesResult, AppError>> {
  const result = await deps.attendanceApi.bulkSetAbsences(date, absentStudentIds);

  if (!result.ok) {
    return result;
  }

  const parsed = bulkSetAbsencesResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
