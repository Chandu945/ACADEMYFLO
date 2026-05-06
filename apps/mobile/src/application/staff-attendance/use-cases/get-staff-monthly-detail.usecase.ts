import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StaffMonthlyDetail } from '../../../domain/staff-attendance/staff-attendance.types';
import {
  staffMonthlyDetailResponseSchema,
  type StaffMonthlyDetailApiResponse,
} from '../../../domain/staff-attendance/staff-attendance.schemas';

export type GetStaffMonthlyDetailApiPort = {
  getStaffMonthlyDetail(
    staffUserId: string,
    month: string,
  ): Promise<Result<StaffMonthlyDetailApiResponse, AppError>>;
};

export type GetStaffMonthlyDetailDeps = {
  staffAttendanceApi: GetStaffMonthlyDetailApiPort;
};

export async function getStaffMonthlyDetailUseCase(
  deps: GetStaffMonthlyDetailDeps,
  staffUserId: string,
  month: string,
): Promise<Result<StaffMonthlyDetail, AppError>> {
  const result = await deps.staffAttendanceApi.getStaffMonthlyDetail(staffUserId, month);

  if (!result.ok) {
    return result;
  }

  const parsed = staffMonthlyDetailResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({
      code: 'UNKNOWN',
      message:
        'Unexpected server response: ' +
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    });
  }

  return ok(parsed.data);
}
