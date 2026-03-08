import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type {
  StaffAttendanceStatus,
  MarkStaffAttendanceResult,
} from '../../../domain/staff-attendance/staff-attendance.types';
import {
  markStaffAttendanceResponseSchema,
  type MarkStaffAttendanceApiResponse,
} from '../../../domain/staff-attendance/staff-attendance.schemas';

export type MarkStaffAttendanceApiPort = {
  markStaffAttendance(
    staffUserId: string,
    date: string,
    status: StaffAttendanceStatus,
  ): Promise<Result<MarkStaffAttendanceApiResponse, AppError>>;
};

export type MarkStaffAttendanceDeps = {
  staffAttendanceApi: MarkStaffAttendanceApiPort;
};

export async function markStaffAttendanceUseCase(
  deps: MarkStaffAttendanceDeps,
  staffUserId: string,
  date: string,
  status: StaffAttendanceStatus,
): Promise<Result<MarkStaffAttendanceResult, AppError>> {
  const result = await deps.staffAttendanceApi.markStaffAttendance(staffUserId, date, status);

  if (!result.ok) {
    return result;
  }

  const parsed = markStaffAttendanceResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
