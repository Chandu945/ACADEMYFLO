import { z } from 'zod';

const staffQualificationInfoSchema = z.object({
  qualification: z.string().nullable(),
  position: z.string().nullable(),
});

const staffSalaryConfigSchema = z.object({
  amount: z.number().nullable(),
  frequency: z.enum(['MONTHLY', 'WEEKLY', 'DAILY']),
});

export const staffListItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  role: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  academyId: z.string(),
  startDate: z.string().nullable().optional().default(null),
  // Backend staff DTOs (create/update) constrain gender to ['MALE', 'FEMALE'] —
  // unlike student/enquiry which use the full GENDERS contract (incl. OTHER).
  // Mobile picker for staff matches that narrower set, so the schema stays in
  // sync; OTHER intentionally omitted to mirror backend.
  gender: z.enum(['MALE', 'FEMALE']).nullable().optional().default(null),
  whatsappNumber: z.string().nullable().optional().default(null),
  mobileNumber: z.string().nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  qualificationInfo: staffQualificationInfoSchema.nullable().optional().default(null),
  salaryConfig: staffSalaryConfigSchema.nullable().optional().default(null),
  profilePhotoUrl: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const staffListResponseSchema = z.object({
  data: z.array(staffListItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const staffMutationResponseSchema = z.object({
  id: z.string(),
});

export const staffStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type StaffListApiResponse = z.infer<typeof staffListResponseSchema>;
export type StaffMutationApiResponse = z.infer<typeof staffMutationResponseSchema>;
export type StaffStatusApiResponse = z.infer<typeof staffStatusResponseSchema>;
