import type {
  EnquiryDetail,
  EnquiryListQuery,
  EnquirySummary,
  CreateEnquiryRequest,
  UpdateEnquiryRequest,
  AddFollowUpRequest,
  CloseEnquiryRequest,
  ConvertToStudentRequest,
  ConvertToStudentResponse,
} from '../../domain/enquiry/enquiry.types';
import {
  enquiryListResponseSchema,
  enquiryDetailSchema,
  enquirySummarySchema,
  convertToStudentResponseSchema,
  type EnquiryListApiResponse,
} from '../../domain/enquiry/enquiry.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut } from '../http/api-client';
import type { ZodSchema } from 'zod';

// Same validateResponse pattern as student-api / staff-api / holidays-api.
// Backend drift surfaces as a clear VALIDATION rather than `undefined.foo`
// crashes deep in screens.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[enquiryApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export async function listEnquiries(
  query: EnquiryListQuery,
): Promise<Result<EnquiryListApiResponse, AppError>> {
  const parts: string[] = [];
  if (query.status) parts.push(`status=${encodeURIComponent(query.status)}`);
  if (query.search) parts.push(`search=${encodeURIComponent(query.search)}`);
  if (query.followUpToday) parts.push('followUpToday=true');
  parts.push(`page=${query.page}`);
  parts.push(`limit=${query.limit}`);

  const result = await apiGet<unknown>(`/api/v1/enquiries?${parts.join('&')}`);
  return validateResponse(
    enquiryListResponseSchema as unknown as ZodSchema<EnquiryListApiResponse>,
    result,
    'listEnquiries',
  );
}

export async function getEnquiryDetail(id: string): Promise<Result<EnquiryDetail, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/enquiries/${encodeURIComponent(id)}`);
  return validateResponse(
    enquiryDetailSchema as unknown as ZodSchema<EnquiryDetail>,
    result,
    'getEnquiryDetail',
  );
}

export async function getEnquirySummary(): Promise<Result<EnquirySummary, AppError>> {
  const result = await apiGet<unknown>('/api/v1/enquiries/summary');
  return validateResponse(
    enquirySummarySchema as unknown as ZodSchema<EnquirySummary>,
    result,
    'getEnquirySummary',
  );
}

export async function createEnquiry(
  req: CreateEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  const result = await apiPost<unknown>('/api/v1/enquiries', req);
  return validateResponse(
    enquiryDetailSchema as unknown as ZodSchema<EnquiryDetail>,
    result,
    'createEnquiry',
  );
}

export async function updateEnquiry(
  id: string,
  req: UpdateEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  const result = await apiPut<unknown>(`/api/v1/enquiries/${encodeURIComponent(id)}`, req);
  return validateResponse(
    enquiryDetailSchema as unknown as ZodSchema<EnquiryDetail>,
    result,
    'updateEnquiry',
  );
}

export async function addFollowUp(
  id: string,
  req: AddFollowUpRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  const result = await apiPost<unknown>(`/api/v1/enquiries/${encodeURIComponent(id)}/follow-ups`, req);
  return validateResponse(
    enquiryDetailSchema as unknown as ZodSchema<EnquiryDetail>,
    result,
    'addFollowUp',
  );
}

export async function closeEnquiry(
  id: string,
  req: CloseEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  const result = await apiPut<unknown>(`/api/v1/enquiries/${encodeURIComponent(id)}/close`, req);
  return validateResponse(
    enquiryDetailSchema as unknown as ZodSchema<EnquiryDetail>,
    result,
    'closeEnquiry',
  );
}

export async function convertToStudent(
  id: string,
  req: ConvertToStudentRequest,
): Promise<Result<ConvertToStudentResponse, AppError>> {
  const result = await apiPost<unknown>(`/api/v1/enquiries/${encodeURIComponent(id)}/convert`, req);
  return validateResponse(
    convertToStudentResponseSchema as unknown as ZodSchema<ConvertToStudentResponse>,
    result,
    'convertToStudent',
  );
}

export const enquiryApi = {
  listEnquiries,
  getEnquiryDetail,
  getEnquirySummary,
  createEnquiry,
  updateEnquiry,
  addFollowUp,
  closeEnquiry,
  convertToStudent,
};
