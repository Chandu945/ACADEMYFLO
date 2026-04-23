export type AcademyReview = {
  id: string;
  academyId: string;
  parentUserId: string;
  parentName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademyReviewSummary = {
  count: number;
  averageRating: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

export type UpsertReviewInput = {
  rating: number;
  comment?: string | null;
};
