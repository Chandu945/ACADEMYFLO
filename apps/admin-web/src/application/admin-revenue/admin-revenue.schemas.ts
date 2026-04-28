import { z } from 'zod';

const tierSliceSchema = z.object({
  tierKey: z.enum(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']),
  count: z.number().int().min(0),
  mrrInr: z.number().min(0),
});

export const adminRevenueSchema = z.object({
  asOf: z.string(),
  activePaidCount: z.number().int().min(0),
  mrrInr: z.number().min(0),
  arrInr: z.number().min(0),
  activeTrialCount: z.number().int().min(0),
  tierDistribution: z.array(tierSliceSchema),
  thisMonth: z.object({
    label: z.string(),
    newPaidCount: z.number().int().min(0),
    newPaidMrrInr: z.number().min(0),
  }),
  conversion30d: z.object({
    signups: z.number().int().min(0),
    converted: z.number().int().min(0),
    rate: z.number().min(0).max(1).nullable(),
  }),
});

export type AdminRevenuePayload = z.infer<typeof adminRevenueSchema>;
export type TierSlice = z.infer<typeof tierSliceSchema>;
