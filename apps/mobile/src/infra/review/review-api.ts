import { type ZodSchema } from 'zod';
import type {
  AcademyReview,
  AcademyReviewSummary,
  UpsertReviewInput,
} from '../../domain/review/review.types';
import {
  academyReviewSchema,
  academyReviewListSchema,
  academyReviewSummarySchema,
} from '../../domain/review/review.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiDelete } from '../http/api-client';

// Matches the validateResponse pattern used by parent-api / holidays-api — any
// backend drift surfaces as a VALIDATION error instead of a silent undefined.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[reviewApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

// Parent-side: /api/v1/parent/review returns the review or null.
const myReviewResponseSchema = academyReviewSchema.nullable();

export async function getMyReview(): Promise<Result<AcademyReview | null, AppError>> {
  const result = await apiGet<unknown>('/api/v1/parent/review');
  return validateResponse(myReviewResponseSchema, result, 'getMyReview');
}

export async function upsertMyReview(
  input: UpsertReviewInput,
): Promise<Result<AcademyReview, AppError>> {
  const result = await apiPost<unknown>('/api/v1/parent/review', {
    rating: input.rating,
    ...(input.comment ? { comment: input.comment } : {}),
  });
  return validateResponse(academyReviewSchema, result, 'upsertMyReview');
}

export async function deleteMyReview(): Promise<Result<void, AppError>> {
  // 204 No Content — nothing to validate.
  const result = await apiDelete<unknown>('/api/v1/parent/review');
  if (!result.ok) return result;
  return ok(undefined);
}

export async function listOwnerReviews(): Promise<Result<AcademyReview[], AppError>> {
  const result = await apiGet<unknown>('/api/v1/owner/reviews');
  return validateResponse(
    academyReviewListSchema as unknown as ZodSchema<AcademyReview[]>,
    result,
    'listOwnerReviews',
  );
}

export async function getOwnerReviewsSummary(): Promise<
  Result<AcademyReviewSummary, AppError>
> {
  const result = await apiGet<unknown>('/api/v1/owner/reviews/summary');
  return validateResponse(academyReviewSummarySchema, result, 'getOwnerReviewsSummary');
}

export const reviewApi = {
  getMyReview,
  upsertMyReview,
  deleteMyReview,
  listOwnerReviews,
  getOwnerReviewsSummary,
};
