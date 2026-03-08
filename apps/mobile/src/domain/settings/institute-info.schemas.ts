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
  qrCodeImageUrl: z.string().nullable(),
});
