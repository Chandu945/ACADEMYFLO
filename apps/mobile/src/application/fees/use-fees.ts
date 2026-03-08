import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { FeeDueItem } from '../../domain/fees/fees.types';
import {
  listUnpaidDuesUseCase,
  type ListUnpaidDuesApiPort,
} from './use-cases/list-unpaid-dues.usecase';
import { listPaidDuesUseCase, type ListPaidDuesApiPort } from './use-cases/list-paid-dues.usecase';

export type FeesApiPort = ListUnpaidDuesApiPort & ListPaidDuesApiPort;

type UseFeesResult = {
  unpaidItems: FeeDueItem[];
  paidItems: FeeDueItem[];
  loading: boolean;
  error: AppError | null;
  month: string;
  setMonth: (m: string) => void;
  refetch: () => void;
};

function getCurrentMonthIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export { getCurrentMonthIST };

export function useFees(feesApi: FeesApiPort): UseFeesResult {
  const [month, setMonth] = useState(getCurrentMonthIST);
  const [unpaidItems, setUnpaidItems] = useState<FeeDueItem[]>([]);
  const [paidItems, setPaidItems] = useState<FeeDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [unpaidResult, paidResult] = await Promise.all([
      listUnpaidDuesUseCase({ feesApi }, month),
      listPaidDuesUseCase({ feesApi }, month),
    ]);

    if (!mountedRef.current) return;

    if (!unpaidResult.ok) {
      setError(unpaidResult.error);
      setLoading(false);
      return;
    }
    if (!paidResult.ok) {
      setError(paidResult.error);
      setLoading(false);
      return;
    }

    setUnpaidItems(unpaidResult.value);
    setPaidItems(paidResult.value);
    setLoading(false);
  }, [month, feesApi]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { unpaidItems, paidItems, loading, error, month, setMonth, refetch };
}
