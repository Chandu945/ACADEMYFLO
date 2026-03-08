import type {
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchListItem,
} from '../../domain/batch/batch.types';
import type { BatchListApiResponse } from '../../domain/batch/batch.schemas';
import type { StudentListApiResponse } from '../../domain/student/student.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../http/api-client';

export function listBatches(
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<BatchListApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  return apiGet<BatchListApiResponse>(`/api/v1/batches?${parts.join('&')}`);
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

export function getStudentBatches(
  studentId: string,
): Promise<Result<BatchListItem[], AppError>> {
  return apiGet<BatchListItem[]>(`/api/v1/students/${studentId}/batches`);
}

export function setStudentBatches(
  studentId: string,
  batchIds: string[],
): Promise<Result<BatchListItem[], AppError>> {
  return apiPut<BatchListItem[]>(`/api/v1/students/${studentId}/batches`, { batchIds });
}

export function listBatchStudents(
  batchId: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<Result<StudentListApiResponse, AppError>> {
  const parts: string[] = [];
  parts.push(`page=${encodeURIComponent(String(page))}`);
  parts.push(`pageSize=${encodeURIComponent(String(pageSize))}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  return apiGet<StudentListApiResponse>(
    `/api/v1/batches/${batchId}/students?${parts.join('&')}`,
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
