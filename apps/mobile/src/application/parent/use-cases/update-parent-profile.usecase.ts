import type { ParentProfile, UpdateProfileRequest } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { parentProfileSchema } from '../../../domain/parent/parent.schemas';

export type UpdateParentProfileApiPort = {
  updateParentProfile(req: UpdateProfileRequest): Promise<Result<ParentProfile, AppError>>;
};

export async function updateParentProfileUseCase(
  req: UpdateProfileRequest,
  deps: { parentApi: UpdateParentProfileApiPort },
): Promise<Result<ParentProfile, AppError>> {
  const result = await deps.parentApi.updateParentProfile(req);
  if (!result.ok) return result;

  const parsed = parentProfileSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
