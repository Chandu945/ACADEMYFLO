import { z } from 'zod';

const subscriptionStatusSchema = z.enum([
  'TRIAL',
  'ACTIVE_PAID',
  'EXPIRED_GRACE',
  'BLOCKED',
  'DISABLED',
]);

const tierKeySchema = z.enum(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']);

export const academyDetailResponseSchema = z.object({
  academyId: z.string(),
  academyName: z.string(),
  loginDisabled: z.boolean(),
  ownerUserId: z.string(),
  ownerName: z.string(),
  ownerEmail: z.string(),
  ownerPhone: z.string(),
  ownerProfilePhotoUrl: z.string().nullable().optional().default(null),
  subscription: z
    .object({
      id: z.string(),
      status: subscriptionStatusSchema,
      trialStartAt: z.string().nullable(),
      trialEndAt: z.string().nullable(),
      paidStartAt: z.string().nullable(),
      paidEndAt: z.string().nullable(),
      tierKey: tierKeySchema.nullable(),
      pendingTierKey: tierKeySchema.nullable().optional().default(null),
      pendingTierEffectiveAt: z.string().nullable().optional().default(null),
      manualNotes: z.string().nullable(),
      paymentReference: z.string().nullable(),
    })
    .nullable(),
  studentCount: z.number().int().min(0),
  staffCount: z.number().int().min(0),
  revenueThisMonth: z.number().min(0),
});
