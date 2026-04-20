import type {
  CreateStaffInput,
  UpdateStaffInput,
  SetStaffStatusInput,
} from '../../domain/staff/staff.types';
import {
  staffListResponseSchema,
  staffMutationResponseSchema,
  staffStatusResponseSchema,
  type StaffListApiResponse,
  type StaffMutationApiResponse,
  type StaffStatusApiResponse,
} from '../../domain/staff/staff.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPatch } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same validateResponse pattern as student-api / holidays-api / subscription-api.
// Backend drift surfaces as a clear VALIDATION rather than a silent undefined
// downstream.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[staffApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function listStaff(
  page: number,
  pageSize: number,
): Promise<Result<StaffListApiResponse, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/staff?page=${page}&pageSize=${pageSize}`);
  return validateResponse(
    staffListResponseSchema as unknown as ZodSchema<StaffListApiResponse>,
    result,
    'listStaff',
  );
}

export async function createStaff(
  input: CreateStaffInput,
): Promise<Result<StaffMutationApiResponse, AppError>> {
  const result = await apiPost<unknown>('/api/v1/staff', input);
  return validateResponse(staffMutationResponseSchema, result, 'createStaff');
}

export async function updateStaff(
  staffId: string,
  input: UpdateStaffInput,
): Promise<Result<StaffMutationApiResponse, AppError>> {
  const result = await apiPatch<unknown>(`/api/v1/staff/${staffId}`, input);
  return validateResponse(staffMutationResponseSchema, result, 'updateStaff');
}

export async function setStaffStatus(
  staffId: string,
  input: SetStaffStatusInput,
): Promise<Result<StaffStatusApiResponse, AppError>> {
  const result = await apiPatch<unknown>(`/api/v1/staff/${staffId}/status`, input);
  return validateResponse(staffStatusResponseSchema, result, 'setStaffStatus');
}

export function getStaffPhotoUploadPath(staffId: string): string {
  return `/api/v1/staff/${staffId}/photo`;
}

export const staffApi = { listStaff, createStaff, updateStaff, setStaffStatus, getStaffPhotoUploadPath };
