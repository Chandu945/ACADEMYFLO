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
  // Phase 4 additions — default to 'STAFF' + nulls if server omits them so
  // the mobile app works against older API builds during rollout.
  source: z.enum(['STAFF', 'PARENT']).optional().transform((v) => v ?? 'STAFF'),
  paymentMethod: z
    .enum(['UPI', 'BANK', 'CASH', 'OTHER'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  proofImageUrl: z.string().nullable().optional().transform((v) => v ?? null),
  paymentRefNumber: z.string().nullable().optional().transform((v) => v ?? null),
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
