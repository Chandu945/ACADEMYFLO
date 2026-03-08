import type {
  CreateStaffInput,
  UpdateStaffInput,
  SetStaffStatusInput,
} from '../../domain/staff/staff.types';
import type { StaffListApiResponse } from '../../domain/staff/staff.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPatch } from '../http/api-client';

export function listStaff(
  page: number,
  pageSize: number,
): Promise<Result<StaffListApiResponse, AppError>> {
  return apiGet<StaffListApiResponse>(`/api/v1/staff?page=${page}&pageSize=${pageSize}`);
}

export function createStaff(input: CreateStaffInput): Promise<Result<unknown, AppError>> {
  return apiPost('/api/v1/staff', input);
}

export function updateStaff(
  staffId: string,
  input: UpdateStaffInput,
): Promise<Result<unknown, AppError>> {
  return apiPatch(`/api/v1/staff/${staffId}`, input);
}

export function setStaffStatus(
  staffId: string,
  input: SetStaffStatusInput,
): Promise<Result<unknown, AppError>> {
  return apiPatch(`/api/v1/staff/${staffId}/status`, input);
}

export function getStaffPhotoUploadPath(staffId: string): string {
  return `/api/v1/staff/${staffId}/photo`;
}

export const staffApi = { listStaff, createStaff, updateStaff, setStaffStatus, getStaffPhotoUploadPath };
