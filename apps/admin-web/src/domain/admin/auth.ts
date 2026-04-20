import { z } from 'zod';

export const adminUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string(),
  role: z.literal('SUPER_ADMIN'),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  user: adminUserSchema,
  deviceId: z.string().min(1),
});

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
