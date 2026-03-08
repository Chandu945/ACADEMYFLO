import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type {
  AttendanceStatus,
  MarkAttendanceResult,
} from '../../../domain/attendance/attendance.types';
import {
  markAttendanceResponseSchema,
  type MarkAttendanceApiResponse,
} from '../../../domain/attendance/attendance.schemas';

export type MarkAttendanceApiPort = {
  markAttendance(
    studentId: string,
    date: string,
    status: AttendanceStatus,
  ): Promise<Result<MarkAttendanceApiResponse, AppError>>;
};

export type MarkAttendanceDeps = {
  attendanceApi: MarkAttendanceApiPort;
};

export async function markAttendanceUseCase(
  deps: MarkAttendanceDeps,
  studentId: string,
  date: string,
  status: AttendanceStatus,
): Promise<Result<MarkAttendanceResult, AppError>> {
  const result = await deps.attendanceApi.markAttendance(studentId, date, status);

  if (!result.ok) {
    return result;
  }

  const parsed = markAttendanceResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
