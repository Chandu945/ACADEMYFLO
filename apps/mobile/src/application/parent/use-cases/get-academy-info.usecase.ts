import type { AcademyInfo } from '../../../domain/parent/parent.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { academyInfoSchema } from '../../../domain/parent/parent.schemas';

export type GetAcademyInfoApiPort = {
  getAcademyInfo(): Promise<Result<AcademyInfo, AppError>>;
};

export async function getAcademyInfoUseCase(
  deps: { parentApi: GetAcademyInfoApiPort },
): Promise<Result<AcademyInfo, AppError>> {
  const result = await deps.parentApi.getAcademyInfo();
  if (!result.ok) return result;

  const parsed = academyInfoSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
