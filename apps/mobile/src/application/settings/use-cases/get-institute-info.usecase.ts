import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { InstituteInfo } from '../../../domain/settings/institute-info.types';
import { instituteInfoSchema } from '../../../domain/settings/institute-info.schemas';

export type InstituteInfoApiPort = {
  getInstituteInfo(): Promise<Result<InstituteInfo, AppError>>;
};

export type GetInstituteInfoDeps = {
  api: InstituteInfoApiPort;
};

export async function getInstituteInfoUseCase(
  deps: GetInstituteInfoDeps,
): Promise<Result<InstituteInfo, AppError>> {
  const result = await deps.api.getInstituteInfo();

  if (!result.ok) {
    return result;
  }

  const parsed = instituteInfoSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
