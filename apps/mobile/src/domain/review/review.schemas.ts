import { z } from 'zod';

export const academyReviewSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  parentUserId: z.string(),
  parentName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const academyReviewNullableSchema = academyReviewSchema.nullable();

export const academyReviewListSchema = z.array(academyReviewSchema);

export const academyReviewSummarySchema = z.object({
  count: z.number().int().min(0),
  averageRating: z.number().min(0),
  distribution: z.object({
    '1': z.number().int().min(0),
    '2': z.number().int().min(0),
    '3': z.number().int().min(0),
    '4': z.number().int().min(0),
    '5': z.number().int().min(0),
  }),
});
