import { z } from 'zod';

/**
 * Wire validation for GET /api/v1/profile and PUT /api/v1/profile. Mirrors
 * UserProfile in profile.types.ts. `profilePhotoUrl` is nullable per the API
 * (no photo yet) and `.optional()` for forward-compat with deployments that
 * may omit the key entirely.
 */
export const userProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  role: z.string(),
  status: z.string(),
  profilePhotoUrl: z.string().nullable().optional(),
});
