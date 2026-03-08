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
  const result = await deps.enquiryApi.listEnquiries(query);

  if (!result.ok) return result;

  const parsed = enquiryListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok({
    items: parsed.data.data as EnquiryListItem[],
    meta: parsed.data.pagination,
  });
}
