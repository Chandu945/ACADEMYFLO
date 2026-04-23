import { z } from 'zod';

export const studentListItemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.object({
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
  }),
  guardian: z.object({
    name: z.string(),
    mobile: z.string(),
    email: z.string(),
  }).nullable(),
  joiningDate: z.string(),
  monthlyFee: z.number(),
  mobileNumber: z.string().nullable(),
  email: z.string().nullable(),
  profilePhotoUrl: z.string().nullable().optional().default(null),
  fatherName: z.string().nullable().optional().default(null),
  motherName: z.string().nullable().optional().default(null),
  whatsappNumber: z.string().nullable().optional().default(null),
  addressText: z.string().nullable().optional().default(null),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LEFT']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const studentListResponseSchema = z.object({
  data: z.array(studentListItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const studentCredentialsSchema = z.object({
  studentName: z.string(),
  loginId: z.string(),
  loginIdType: z.enum(['MOBILE', 'EMAIL']),
  hasPassword: z.boolean(),
  academyName: z.string(),
  shareText: z.string(),
});

export const inviteParentResponseSchema = z.object({
  parentId: z.string(),
  studentId: z.string(),
  parentEmail: z.string(),
  tempPassword: z.string(),
  isExistingUser: z.boolean(),
});

// createStudent / updateStudent return shapes vary across legacy controllers,
// but every consumer only needs id back. Validate exactly that.
export const studentMutationResponseSchema = z.object({
  id: z.string(),
});

export type StudentListApiResponse = z.infer<typeof studentListResponseSchema>;
export type StudentMutationApiResponse = z.infer<typeof studentMutationResponseSchema>;
