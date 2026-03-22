import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type {
  InstituteInfo,
  UpdateInstituteInfoRequest,
} from '../../domain/settings/institute-info.types';
import {
  getInstituteInfoUseCase,
  type InstituteInfoApiPort,
} from './use-cases/get-institute-info.usecase';
import {
  updateInstituteInfoUseCase,
  type UpdateInstituteInfoApiPort,
} from './use-cases/update-institute-info.usecase';

type InstituteInfoApiCombined = InstituteInfoApiPort & UpdateInstituteInfoApiPort;

type UseInstituteInfoResult = {
  info: InstituteInfo | null;
  loading: boolean;
  saving: boolean;
  error: AppError | null;
  refetch: () => void;
  update: (req: UpdateInstituteInfoRequest) => Promise<AppError | null>;
};

export function useInstituteInfo(api: InstituteInfoApiCombined): UseInstituteInfoResult {
  const [info, setInfo] = useState<InstituteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getInstituteInfoUseCase({ api });

      if (!mountedRef.current) return;

      if (result.ok) {
        setInfo(result.value);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[useInstituteInfo] Load failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [api]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (req: UpdateInstituteInfoRequest): Promise<AppError | null> => {
      setSaving(true);
      setError(null);

      try {
        const result = await updateInstituteInfoUseCase({ api }, req);

        if (!mountedRef.current) return null;

        if (result.ok) {
          setInfo(result.value);
          return null;
        }

        setError(result.error);
        return result.error;
      } catch (e) {
        if (__DEV__) console.error('[useInstituteInfo] Save failed:', e);
        return { code: 'UNKNOWN', message: 'Something went wrong.' };
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [api],
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { info, loading, saving, error, refetch, update };
}
