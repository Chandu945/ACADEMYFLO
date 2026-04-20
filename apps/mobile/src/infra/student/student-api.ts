import type {
  StudentListFilters,
  StudentListItem,
  CreateStudentRequest,
  UpdateStudentRequest,
  ChangeStudentStatusRequest,
  StudentCredentials,
  InviteParentResponse,
} from '../../domain/student/student.types';
import {
  studentListItemSchema,
  studentListResponseSchema,
  studentCredentialsSchema,
  inviteParentResponseSchema,
  studentMutationResponseSchema,
  type StudentListApiResponse,
  type StudentMutationApiResponse,
} from '../../domain/student/student.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPatch, apiDelete } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same pattern as subscriptionApi / holidaysApi: validate every response so
// backend drift surfaces as a clear VALIDATION rather than `undefined.foo`
// crashes deep in the UI tree.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[studentApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

function buildListPath(filters: StudentListFilters, page: number, pageSize: number): string {
  const parts: string[] = [`page=${page}`, `pageSize=${pageSize}`];

  if (filters.status) parts.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`);
  if (filters.feeFilter) parts.push(`feeFilter=${encodeURIComponent(filters.feeFilter)}`);
  if (filters.month) parts.push(`month=${encodeURIComponent(filters.month)}`);
  if (filters.batchId) parts.push(`batchId=${encodeURIComponent(filters.batchId)}`);

  return `/api/v1/students?${parts.join('&')}`;
}

export async function listStudents(
  filters: StudentListFilters,
  page: number,
  pageSize: number,
): Promise<Result<StudentListApiResponse, AppError>> {
  const result = await apiGet<unknown>(buildListPath(filters, page, pageSize));
  return validateResponse(
    studentListResponseSchema as unknown as ZodSchema<StudentListApiResponse>,
    result,
    'listStudents',
  );
}

export async function createStudent(
  req: CreateStudentRequest,
): Promise<Result<StudentMutationApiResponse, AppError>> {
  const result = await apiPost<unknown>('/api/v1/students', req);
  return validateResponse(studentMutationResponseSchema, result, 'createStudent');
}

export async function updateStudent(
  id: string,
  req: UpdateStudentRequest,
): Promise<Result<StudentMutationApiResponse, AppError>> {
  const result = await apiPatch<unknown>(`/api/v1/students/${id}`, req);
  return validateResponse(studentMutationResponseSchema, result, 'updateStudent');
}

export async function getStudent(id: string): Promise<Result<StudentListItem, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/students/${id}`);
  return validateResponse(
    studentListItemSchema as unknown as ZodSchema<StudentListItem>,
    result,
    'getStudent',
  );
}

export function deleteStudent(id: string): Promise<Result<unknown, AppError>> {
  return apiDelete(`/api/v1/students/${id}`);
}

export function changeStudentStatus(
  id: string,
  req: ChangeStudentStatusRequest,
): Promise<Result<unknown, AppError>> {
  return apiPatch(`/api/v1/students/${id}/status`, req);
}

export async function getStudentCredentials(
  id: string,
): Promise<Result<StudentCredentials, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/students/${id}/credentials`);
  return validateResponse(
    studentCredentialsSchema as unknown as ZodSchema<StudentCredentials>,
    result,
    'getStudentCredentials',
  );
}

export function getStudentDocumentUrl(
  id: string,
  docType: 'report' | 'registration-form' | 'id-card',
  params?: { fromMonth?: string; toMonth?: string },
): string {
  let path = `/api/v1/students/${id}/documents/${docType}`;
  if (params?.fromMonth || params?.toMonth) {
    const parts: string[] = [];
    if (params.fromMonth) parts.push(`fromMonth=${encodeURIComponent(params.fromMonth)}`);
    if (params.toMonth) parts.push(`toMonth=${encodeURIComponent(params.toMonth)}`);
    path += `?${parts.join('&')}`;
  }
  return path;
}

export async function inviteParent(
  studentId: string,
): Promise<Result<InviteParentResponse, AppError>> {
  const result = await apiPost<unknown>(
    `/api/v1/students/${encodeURIComponent(studentId)}/invite-parent`,
    {},
  );
  return validateResponse(
    inviteParentResponseSchema as unknown as ZodSchema<InviteParentResponse>,
    result,
    'inviteParent',
  );
}

export function getStudentPhotoUploadPath(id: string): string {
  return `/api/v1/students/${id}/photo`;
}

export const studentApi = {
  listStudents, getStudent, createStudent, updateStudent, deleteStudent,
  changeStudentStatus, getStudentCredentials, getStudentDocumentUrl,
  getStudentPhotoUploadPath, inviteParent,
};
