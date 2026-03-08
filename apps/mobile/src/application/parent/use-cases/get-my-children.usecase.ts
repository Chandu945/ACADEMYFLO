import type { ChildSummary } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { childrenListSchema } from '../../../domain/parent/parent.schemas';

export type GetMyChildrenApiPort = {
  getMyChildren(): Promise<Result<ChildSummary[], AppError>>;
};

export async function getMyChildrenUseCase(
  deps: { parentApi: GetMyChildrenApiPort },
): Promise<Result<ChildSummary[], AppError>> {
  const result = await deps.parentApi.getMyChildren();
  if (!result.ok) return result;

  const parsed = childrenListSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
