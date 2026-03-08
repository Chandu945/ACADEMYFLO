import type { ParentProfile } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { parentProfileSchema } from '../../../domain/parent/parent.schemas';

export type GetParentProfileApiPort = {
  getParentProfile(): Promise<Result<ParentProfile, AppError>>;
};

export async function getParentProfileUseCase(
  deps: { parentApi: GetParentProfileApiPort },
): Promise<Result<ParentProfile, AppError>> {
  const result = await deps.parentApi.getParentProfile();
  if (!result.ok) return result;

  const parsed = parentProfileSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
