import { z } from 'zod';

const academyListRowSchema = z.object({
  academyId: z.string(),
  academyName: z.string(),
  ownerName: z.string(),
  ownerEmail: z.string(),
  ownerPhone: z.string().nullable().optional(),
  status: z.string(),
  tierKey: z.string().nullable(),
  activeStudentCount: z.number().nullable().optional(),
  staffCount: z.number().nullable().optional(),
  thisMonthRevenueTotal: z.number().nullable().optional(),
  createdAt: z.string(),
});

const metaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const academiesListResponseSchema = z.object({
  items: z.array(academyListRowSchema),
  meta: metaSchema,
});

export type AcademiesListPayload = z.infer<typeof academiesListResponseSchema>;
