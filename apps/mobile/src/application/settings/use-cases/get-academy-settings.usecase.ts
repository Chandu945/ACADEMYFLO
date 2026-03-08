import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { AcademySettings } from '../../../domain/settings/academy-settings.types';
import { academySettingsSchema } from '../../../domain/settings/academy-settings.schemas';

export type SettingsApiPort = {
  getAcademySettings(): Promise<Result<AcademySettings, AppError>>;
};

export type GetAcademySettingsDeps = {
  settingsApi: SettingsApiPort;
};

export async function getAcademySettingsUseCase(
  deps: GetAcademySettingsDeps,
): Promise<Result<AcademySettings, AppError>> {
  const result = await deps.settingsApi.getAcademySettings();

  if (!result.ok) {
    return result;
  }

  const parsed = academySettingsSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
