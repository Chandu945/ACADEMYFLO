import { z } from 'zod';

export const academySettingsSchema = z.object({
  defaultDueDateDay: z.number().int().min(1).max(28),
  receiptPrefix: z.string().max(20),
});
