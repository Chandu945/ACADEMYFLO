import { z } from 'zod';

export const eventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  eventType: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  isAllDay: z.boolean(),
  location: z.string().nullable(),
  targetAudience: z.string().nullable(),
  batchIds: z.array(z.string()),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const eventDetailSchema = eventListItemSchema.extend({
  updatedAt: z.string(),
  photoCount: z.number().optional(),
});

export const eventListResponseSchema = z.object({
  data: z.array(eventListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const eventSummarySchema = z.object({
  thisMonth: z.object({
    total: z.number(),
    upcoming: z.number(),
  }),
});

export const eventDeleteResponseSchema = z.object({
  deleted: z.boolean(),
});

export type EventListApiResponse = z.infer<typeof eventListResponseSchema>;
export type EventDetailApiResponse = z.infer<typeof eventDetailSchema>;
export type EventSummaryApiResponse = z.infer<typeof eventSummarySchema>;
