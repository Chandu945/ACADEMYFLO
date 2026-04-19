import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { EnquiryListItem, EnquiryListQuery } from '../../../domain/enquiry/enquiry.types';
import { enquiryListResponseSchema } from '../../../domain/enquiry/enquiry.schemas';

export type EnquiryApiPort = {
  listEnquiries(query: EnquiryListQuery): Promise<Result<unknown, AppError>>;
};

export type ListEnquiriesResult = {
  items: EnquiryListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function listEnquiriesUseCase(
  deps: { enquiryApi: EnquiryApiPort },
  query: EnquiryListQuery,
): Promise<Result<ListEnquiriesResult, AppError>> {
  let result: Result<unknown, AppError>;
  try {
    result = await deps.enquiryApi.listEnquiries(query);
  } catch (e) {
    console.error('[listEnquiriesUseCase] API call threw:', e);
    return err({ code: 'NETWORK', message: e instanceof Error ? e.message : 'Network error' });
  }

  if (!result.ok) return result;

  const parsed = enquiryListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    console.error('[listEnquiriesUseCase] Schema mismatch:', JSON.stringify(parsed.error.issues));
    console.error('[listEnquiriesUseCase] Raw value keys:', result.value ? Object.keys(result.value as object) : 'null');
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok({
    items: parsed.data.data as EnquiryListItem[],
    meta: parsed.data.pagination,
  });
}
