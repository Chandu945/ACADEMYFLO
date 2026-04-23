import type { UserRole } from '@academyflo/contracts';

export const MAX_REVIEW_COMMENT_LENGTH = 1000;

export function canSubmitAcademyReview(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'PARENT') {
    return { allowed: false, reason: 'Only parents can review the academy' };
  }
  return { allowed: true };
}

export function canViewAcademyReviews(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only the academy owner can view reviews' };
  }
  return { allowed: true };
}

export function validateRating(rating: number): { valid: boolean; reason?: string } {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, reason: 'Rating must be a whole number from 1 to 5' };
  }
  return { valid: true };
}

export function validateReviewComment(comment: string): { valid: boolean; reason?: string } {
  if (comment.length > MAX_REVIEW_COMMENT_LENGTH) {
    return {
      valid: false,
      reason: `Review comment must be ${MAX_REVIEW_COMMENT_LENGTH} characters or fewer`,
    };
  }
  return { valid: true };
}
