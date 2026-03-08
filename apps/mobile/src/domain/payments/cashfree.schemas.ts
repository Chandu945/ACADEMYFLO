import { z } from 'zod';

export const initiatePaymentResponseSchema = z.object({
  orderId: z.string(),
  paymentSessionId: z.string(),
  amountInr: z.number(),
  currency: z.string(),
  tierKey: z.enum(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']),
  expiresAt: z.string(),
});

export const paymentStatusResponseSchema = z.object({
  orderId: z.string(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
  tierKey: z.enum(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']),
  amountInr: z.number(),
  providerPaymentId: z.string().nullable(),
  paidAt: z.string().nullable(),
  subscription: z.object({
    status: z.string(),
    paidStartAt: z.string().nullable(),
    paidEndAt: z.string().nullable(),
  }),
});
