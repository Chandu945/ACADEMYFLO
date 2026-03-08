import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { EnquirySummary } from '../../../domain/enquiry/enquiry.types';
import { enquirySummarySchema } from '../../../domain/enquiry/enquiry.schemas';

export type EnquirySummaryApiPort = {
  getEnquirySummary(): Promise<Result<EnquirySummary, AppError>>;
};

export async function getEnquirySummaryUseCase(
  deps: { enquiryApi: EnquirySummaryApiPort },
): Promise<Result<EnquirySummary, AppError>> {
  const result = await deps.enquiryApi.getEnquirySummary();

  if (!result.ok) return result;

  const parsed = enquirySummarySchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
