import type {
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchListItem,
} from '../../domain/batch/batch.types';
import {
  batchListResponseSchema,
  batchArraySchema,
  type BatchListApiResponse,
} from '../../domain/batch/batch.schemas';
import {
  studentListResponseSchema,
  type StudentListApiResponse,
} from '../../domain/student/student.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../http/api-client';
import type { ZodSchema } from 'zod';

function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[batchApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function listBatches(
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<BatchListApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  const result = await apiGet<unknown>(`/api/v1/batches?${parts.join('&')}`);
  return validateResponse(
    batchListResponseSchema as unknown as ZodSchema<BatchListApiResponse>,
    result,
    'listBatches',
  );
}

export function createBatch(req: CreateBatchRequest): Promise<Result<unknown, AppError>> {
  return apiPost('/api/v1/batches', req);
}

export function updateBatch(
  id: string,
  req: UpdateBatchRequest,
): Promise<Result<unknown, AppError>> {
  return apiPatch(`/api/v1/batches/${id}`, req);
}

export async function getStudentBatches(
  studentId: string,
): Promise<Result<BatchListItem[], AppError>> {
  const result = await apiGet<unknown>(`/api/v1/students/${studentId}/batches`);
  return validateResponse(
    batchArraySchema as unknown as ZodSchema<BatchListItem[]>,
    result,
    'getStudentBatches',
  );
}

export async function setStudentBatches(
  studentId: string,
  batchIds: string[],
): Promise<Result<BatchListItem[], AppError>> {
  const result = await apiPut<unknown>(`/api/v1/students/${studentId}/batches`, { batchIds });
  return validateResponse(
    batchArraySchema as unknown as ZodSchema<BatchListItem[]>,
    result,
    'setStudentBatches',
  );
}

export async function listBatchStudents(
  batchId: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<StudentListApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  const result = await apiGet<unknown>(`/api/v1/batches/${batchId}/students?${parts.join('&')}`);
  return validateResponse(
    studentListResponseSchema as unknown as ZodSchema<StudentListApiResponse>,
    result,
    'listBatchStudents',
  );
}

export function addStudentToBatch(
  batchId: string,
  studentId: string,
): Promise<Result<unknown, AppError>> {
  return apiPost(`/api/v1/batches/${batchId}/students/${studentId}`);
}

export function removeStudentFromBatch(
  batchId: string,
  studentId: string,
): Promise<Result<unknown, AppError>> {
  return apiDelete(`/api/v1/batches/${batchId}/students/${studentId}`);
}

export function deleteBatch(batchId: string): Promise<Result<unknown, AppError>> {
  return apiDelete(`/api/v1/batches/${batchId}`);
}

export function uploadBatchPhoto(
  batchId: string,
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<Result<{ url: string }, AppError>> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  return apiPost<{ url: string }>(`/api/v1/batches/${batchId}/photo`, formData);
}

export const batchApi = {
  listBatches,
  createBatch,
  updateBatch,
  getStudentBatches,
  setStudentBatches,
  listBatchStudents,
  addStudentToBatch,
  removeStudentFromBatch,
  deleteBatch,
  uploadBatchPhoto,
};
