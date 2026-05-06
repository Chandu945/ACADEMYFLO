import { z } from 'zod';

export const batchListItemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  batchName: z.string(),
  days: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])),
  notes: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  startTime: z.string().nullish().default(null),
  endTime: z.string().nullish().default(null),
  maxStudents: z.number().int().nullish().default(null),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  // Some endpoints (e.g. GET /students/:id/batches) don't include
  // studentCount because the per-student view doesn't need capacity info.
  // Default to 0 so validation succeeds against either response shape.
  studentCount: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const batchListResponseSchema = z.object({
  data: z.array(batchListItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const batchArraySchema = z.array(batchListItemSchema);

export type BatchListApiResponse = z.infer<typeof batchListResponseSchema>;
