import { z } from 'zod';

const itemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  emailNormalized: z.string(),
  phoneE164: z.string(),
  role: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  academyId: z.string().nullable(),
  academyName: z.string().nullable(),
  createdAt: z.string(),
});

const metaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const adminUsersResponseSchema = z.object({
  items: z.array(itemSchema),
  meta: metaSchema,
});

export type AdminUserItem = z.infer<typeof itemSchema>;
export type AdminUsersPayload = z.infer<typeof adminUsersResponseSchema>;
