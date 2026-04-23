export interface AcademyReviewDto {
  id: string;
  academyId: string;
  parentUserId: string;
  parentName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademyReviewSummaryDto {
  count: number;
  averageRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
