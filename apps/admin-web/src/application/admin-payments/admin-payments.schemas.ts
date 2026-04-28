import { z } from 'zod';

export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const itemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  academyName: z.string().nullable(),
  ownerUserId: z.string(),
  ownerName: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  orderId: z.string(),
  cfOrderId: z.string().nullable(),
  tierKey: z.string(),
  amountInr: z.number(),
  currency: z.string(),
  activeStudentCountAtPurchase: z.number(),
  status: z.enum(PAYMENT_STATUSES),
  failureReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const metaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const adminPaymentsResponseSchema = z.object({
  items: z.array(itemSchema),
  meta: metaSchema,
});

export type AdminPaymentItem = z.infer<typeof itemSchema>;
export type AdminPaymentsPayload = z.infer<typeof adminPaymentsResponseSchema>;
