import { z } from 'zod';

export const paymentRequestItemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  studentId: z.string(),
  studentName: z.string().nullable(),
  feeDueId: z.string(),
  monthKey: z.string(),
  amount: z.number().int(),
  staffUserId: z.string(),
  staffName: z.string().nullable(),
  staffNotes: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  reviewedByUserId: z.string().nullable(),
  reviewedByName: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentRequestListResponseSchema = z.object({
  data: z.array(paymentRequestItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

export type PaymentRequestApiResponse = z.infer<typeof paymentRequestItemSchema>;
export type PaymentRequestListApiResponse = z.infer<typeof paymentRequestListResponseSchema>;
