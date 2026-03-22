import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { InstituteInfo, UpdateInstituteInfoRequest } from '../../../domain/settings/institute-info.types';
import { instituteInfoSchema } from '../../../domain/settings/institute-info.schemas';

export type UpdateInstituteInfoApiPort = {
  updateInstituteInfo(req: UpdateInstituteInfoRequest): Promise<Result<InstituteInfo, AppError>>;
};

export type UpdateInstituteInfoDeps = {
  api: UpdateInstituteInfoApiPort;
};

export async function updateInstituteInfoUseCase(
  deps: UpdateInstituteInfoDeps,
  req: UpdateInstituteInfoRequest,
): Promise<Result<InstituteInfo, AppError>> {
  const result = await deps.api.updateInstituteInfo(req);

  if (!result.ok) {
    return result;
  }

  const parsed = instituteInfoSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
  }

  return ok(parsed.data);
}
