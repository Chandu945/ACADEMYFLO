import type { AcademyReview } from '../entities/academy-review.entity';

export const ACADEMY_REVIEW_REPOSITORY = Symbol('ACADEMY_REVIEW_REPOSITORY');

export interface AcademyReviewSummary {
  count: number;
  averageRating: number; // 0 if no reviews
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface AcademyReviewRepository {
  save(review: AcademyReview): Promise<void>;
  findByAcademyAndParent(
    academyId: string,
    parentUserId: string,
  ): Promise<AcademyReview | null>;
  deleteByAcademyAndParent(academyId: string, parentUserId: string): Promise<void>;
  listByAcademy(academyId: string): Promise<AcademyReview[]>;
  summaryByAcademy(academyId: string): Promise<AcademyReviewSummary>;
}
