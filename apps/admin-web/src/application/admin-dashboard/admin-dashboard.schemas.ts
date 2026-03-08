import { z } from 'zod';

export const dashboardCountsSchema = z.object({
  totalAcademies: z.number().int().min(0),
  activeTrials: z.number().int().min(0),
  activePaid: z.number().int().min(0),
  expiredGrace: z.number().int().min(0),
  blocked: z.number().int().min(0),
  disabled: z.number().int().min(0),
});

export type BackendDashboardPayload = z.infer<typeof dashboardCountsSchema>;
