import { z } from 'zod';

export const academyDetailResponseSchema = z.object({
  academyId: z.string(),
  academyName: z.string(),
  loginDisabled: z.boolean(),
  ownerUserId: z.string(),
  ownerName: z.string(),
  ownerEmail: z.string(),
  ownerPhone: z.string(),
  subscription: z
    .object({
      id: z.string(),
      status: z.string(),
      trialStartAt: z.string().nullable(),
      trialEndAt: z.string().nullable(),
      paidStartAt: z.string().nullable(),
      paidEndAt: z.string().nullable(),
      tierKey: z.string().nullable(),
      pendingTierKey: z.string().nullable().optional().default(null),
      pendingTierEffectiveAt: z.string().nullable().optional().default(null),
      manualNotes: z.string().nullable(),
      paymentReference: z.string().nullable(),
    })
    .nullable(),
  studentCount: z.number().int().min(0),
  staffCount: z.number().int().min(0),
  revenueThisMonth: z.number().min(0),
});
