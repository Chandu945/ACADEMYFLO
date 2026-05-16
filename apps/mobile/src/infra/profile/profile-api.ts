/**
 * Owner/staff-facing profile API client.
 *
 * Targets the generic /api/v1/profile family of endpoints which are usable by
 * any authenticated user, scoped server-side to the caller's userId. Distinct
 * from parent-api.ts which targets parent-scoped /api/v1/parent/profile.
 *
 * The `/api/v1/profile/password` change-password endpoint defined here is
 * intentionally shared between owner and parent roles — ChangePasswordScreen
 * selects between this one and the parent-specific endpoint at runtime based
 * on the logged-in user's role.
 */
import type { ZodSchema } from 'zod';
import { apiGet, apiPut } from '../http/api-client';
import type { Result } from '../../domain/common/result';
import { ok, err } from '../../domain/common/result';
import type { AppError } from '../../domain/common/errors';
import { userProfileSchema } from '../../domain/profile/profile.schemas';
import type { UserProfile, UpdateUserProfileRequest } from '../../domain/profile/profile.types';

// Same validateResponse pattern as the rest of the mobile API clients —
// schema mismatch becomes a recoverable VALIDATION error instead of an
// `undefined.foo` runtime explosion in a screen render.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[profileApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    const detail = parsed.error.issues
      .slice(0, 2)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    const truncated = detail.length > 180 ? `${detail.slice(0, 180)}…` : detail;
    return err({
      code: 'UNKNOWN',
      message: truncated
        ? `Unexpected server response (${truncated})`
        : 'Unexpected server response',
    });
  }
  return ok(parsed.data);
}

export async function getMyProfile(): Promise<Result<UserProfile, AppError>> {
  const result = await apiGet<unknown>('/api/v1/profile');
  return validateResponse(
    userProfileSchema as unknown as ZodSchema<UserProfile>,
    result,
    'getMyProfile',
  );
}

export async function updateMyProfile(
  req: UpdateUserProfileRequest,
): Promise<Result<UserProfile, AppError>> {
  const result = await apiPut<unknown>('/api/v1/profile', req);
  return validateResponse(
    userProfileSchema as unknown as ZodSchema<UserProfile>,
    result,
    'updateMyProfile',
  );
}

export function changeMyPassword(req: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result<void, AppError>> {
  return apiPut<void>('/api/v1/profile/password', req);
}

export const profileApi = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
