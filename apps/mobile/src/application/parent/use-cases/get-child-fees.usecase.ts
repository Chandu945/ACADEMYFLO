import type { ChildFeeDue } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { childFeesListSchema } from '../../../domain/parent/parent.schemas';

export type GetChildFeesApiPort = {
  getChildFees(studentId: string, from: string, to: string): Promise<Result<ChildFeeDue[], AppError>>;
};

export async function getChildFeesUseCase(
  deps: { parentApi: GetChildFeesApiPort },
  studentId: string,
  from: string,
  to: string,
): Promise<Result<ChildFeeDue[], AppError>> {
  const result = await deps.parentApi.getChildFees(studentId, from, to);
  if (!result.ok) return result;

  const parsed = childFeesListSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
