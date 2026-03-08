import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type {
  AcademySettings,
  UpdateAcademySettingsRequest,
} from '../../domain/settings/academy-settings.types';
import { getAcademySettingsUseCase, type SettingsApiPort } from './use-cases/get-academy-settings.usecase';
import { updateAcademySettingsUseCase, type UpdateSettingsApiPort } from './use-cases/update-academy-settings.usecase';

type SettingsApiCombined = SettingsApiPort & UpdateSettingsApiPort;

type UseAcademySettingsResult = {
  settings: AcademySettings | null;
  loading: boolean;
  saving: boolean;
  error: AppError | null;
  refetch: () => void;
  update: (req: UpdateAcademySettingsRequest) => Promise<AppError | null>;
};

export function useAcademySettings(settingsApi: SettingsApiCombined): UseAcademySettingsResult {
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getAcademySettingsUseCase({ settingsApi });

    if (!mountedRef.current) return;

    if (result.ok) {
      setSettings(result.value);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [settingsApi]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (req: UpdateAcademySettingsRequest): Promise<AppError | null> => {
      setSaving(true);
      setError(null);

      const result = await updateAcademySettingsUseCase({ settingsApi }, req);

      if (!mountedRef.current) return null;

      setSaving(false);

      if (result.ok) {
        setSettings(result.value);
        return null;
      }

      setError(result.error);
      return result.error;
    },
    [settingsApi],
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { settings, loading, saving, error, refetch, update };
}
