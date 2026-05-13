import { z } from 'zod';

export const academySettingsSchema = z.object({
  defaultDueDateDay: z.number().int().min(1).max(28),
  receiptPrefix: z.string().max(20),
  lateFeeEnabled: z.boolean(),
  gracePeriodDays: z.number().int().min(0).max(30),
  lateFeeAmountInr: z.number().int().min(0).max(10000),
  // Backend constrains this to ALLOWED_REPEAT_INTERVALS = [1, 3, 5]
  // (packages/contracts/src/constants/fee-due.ts). A bare `.min(1)` would
  // let mobile submit values backend rejects (e.g. 2, 7) and surface only
  // after the network round-trip. Match the contract so the picker /
  // submit validation rejects bad values inline.
  lateFeeRepeatIntervalDays: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});
