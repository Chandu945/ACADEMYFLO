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
import type { EnquiryListApiResponse } from '../../domain/enquiry/enquiry.schemas';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut, apiPatch } from '../http/api-client';

export function listEnquiries(
  query: EnquiryListQuery,
): Promise<Result<EnquiryListApiResponse, AppError>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.followUpToday) params.set('followUpToday', 'true');
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));

  return apiGet<EnquiryListApiResponse>(`/api/v1/enquiries?${params.toString()}`);
}

export function getEnquiryDetail(id: string): Promise<Result<EnquiryDetail, AppError>> {
  return apiGet<EnquiryDetail>(`/api/v1/enquiries/${id}`);
}

export function getEnquirySummary(): Promise<Result<EnquirySummary, AppError>> {
  return apiGet<EnquirySummary>('/api/v1/enquiries/summary');
}

export function createEnquiry(
  req: CreateEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  return apiPost<EnquiryDetail>('/api/v1/enquiries', req);
}

export function updateEnquiry(
  id: string,
  req: UpdateEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  return apiPatch<EnquiryDetail>(`/api/v1/enquiries/${id}`, req);
}

export function addFollowUp(
  id: string,
  req: AddFollowUpRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  return apiPost<EnquiryDetail>(`/api/v1/enquiries/${id}/follow-ups`, req);
}

export function closeEnquiry(
  id: string,
  req: CloseEnquiryRequest,
): Promise<Result<EnquiryDetail, AppError>> {
  return apiPut<EnquiryDetail>(`/api/v1/enquiries/${id}/close`, req);
}

export function convertToStudent(
  id: string,
  req: ConvertToStudentRequest,
): Promise<Result<ConvertToStudentResponse, AppError>> {
  return apiPost<ConvertToStudentResponse>(`/api/v1/enquiries/${id}/convert`, req);
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
