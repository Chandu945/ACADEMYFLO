import type { AcademySettings, UpdateAcademySettingsRequest } from '../../domain/settings/academy-settings.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPut } from '../http/api-client';

export function getAcademySettings(): Promise<Result<AcademySettings, AppError>> {
  return apiGet<AcademySettings>('/api/v1/settings/academy');
}

export function updateAcademySettings(
  req: UpdateAcademySettingsRequest,
): Promise<Result<AcademySettings, AppError>> {
  return apiPut<AcademySettings>('/api/v1/settings/academy', req);
}

export const settingsApi = {
  getAcademySettings,
  updateAcademySettings,
};
