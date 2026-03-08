import { z } from 'zod';

export const manualSubscriptionSchema = z
  .object({
    tierKey: z.enum(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']),
    paidStartAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
    paidEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
    manualNotes: z.string().max(200).optional(),
    paymentReference: z.string().max(200).optional(),
  })
  .refine((data) => data.paidStartAt <= data.paidEndAt, {
    message: 'Start date must be before or equal to end date',
    path: ['paidEndAt'],
  });

export const disableLoginSchema = z.object({
  disabled: z.boolean(),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8).optional(),
});
