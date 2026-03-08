import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { StaffListItem } from '../../../domain/staff/staff.types';
import {
  staffListResponseSchema,
  type StaffListApiResponse,
} from '../../../domain/staff/staff.schemas';

export type StaffApiPort = {
  listStaff(page: number, pageSize: number): Promise<Result<StaffListApiResponse, AppError>>;
};

export type ListStaffDeps = {
  staffApi: StaffApiPort;
};

export type ListStaffResult = {
  items: StaffListItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listStaffUseCase(
  deps: ListStaffDeps,
  page: number,
  pageSize: number,
): Promise<Result<ListStaffResult, AppError>> {
  const result = await deps.staffApi.listStaff(page, pageSize);

  if (!result.ok) {
    return result;
  }

  const parsed = staffListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok({
    items: parsed.data.data,
    meta: parsed.data.meta,
  });
}
