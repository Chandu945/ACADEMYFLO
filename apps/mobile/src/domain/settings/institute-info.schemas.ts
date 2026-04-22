import { z } from 'zod';

export const bankDetailsSchema = z.object({
  accountHolderName: z.string(),
  accountNumber: z.string(),
  ifscCode: z.string(),
  bankName: z.string(),
  branchName: z.string(),
});

export const instituteInfoSchema = z.object({
  signatureStampUrl: z.string().nullable(),
  bankDetails: bankDetailsSchema.nullable(),
  upiId: z.string().nullable(),
  // New fields — default to safe values if the server returns an older shape.
  upiHolderName: z.string().nullable().optional().transform((v) => v ?? null),
  qrCodeImageUrl: z.string().nullable(),
  manualPaymentsEnabled: z.boolean().optional().transform((v) => v ?? false),
});
