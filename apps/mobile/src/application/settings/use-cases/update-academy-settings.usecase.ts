import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type {
  AcademySettings,
  UpdateAcademySettingsRequest,
} from '../../../domain/settings/academy-settings.types';
import { academySettingsSchema } from '../../../domain/settings/academy-settings.schemas';

export type UpdateSettingsApiPort = {
  updateAcademySettings(
    req: UpdateAcademySettingsRequest,
  ): Promise<Result<AcademySettings, AppError>>;
};

export type UpdateAcademySettingsDeps = {
  settingsApi: UpdateSettingsApiPort;
};

export async function updateAcademySettingsUseCase(
  deps: UpdateAcademySettingsDeps,
  req: UpdateAcademySettingsRequest,
): Promise<Result<AcademySettings, AppError>> {
  const result = await deps.settingsApi.updateAcademySettings(req);

  if (!result.ok) {
    return result;
  }

  const parsed = academySettingsSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
