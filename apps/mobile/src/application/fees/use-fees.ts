import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { FeeDueItem } from '../../domain/fees/fees.types';
import {
  listUnpaidDuesUseCase,
  type ListUnpaidDuesApiPort,
} from './use-cases/list-unpaid-dues.usecase';
import { listPaidDuesUseCase, type ListPaidDuesApiPort } from './use-cases/list-paid-dues.usecase';
import { getCurrentMonthIST } from '../../domain/common/date-utils';

export type FeesApiPort = ListUnpaidDuesApiPort & ListPaidDuesApiPort;

const UNPAID_PAGE_SIZE = 20;

type UseFeesResult = {
  unpaidItems: FeeDueItem[];
  paidItems: FeeDueItem[];
  loading: boolean;
  error: AppError | null;
  month: string;
  setMonth: (m: string) => void;
  refetch: () => void;
  unpaidTotal: number;
  hasMoreUnpaid: boolean;
  loadingMoreUnpaid: boolean;
  fetchMoreUnpaid: () => void;
};

export { getCurrentMonthIST };

export function useFees(feesApi: FeesApiPort): UseFeesResult {
  const [month, setMonth] = useState(getCurrentMonthIST);
  const [unpaidItems, setUnpaidItems] = useState<FeeDueItem[]>([]);
  const [paidItems, setPaidItems] = useState<FeeDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [hasMoreUnpaid, setHasMoreUnpaid] = useState(false);
  const [loadingMoreUnpaid, setLoadingMoreUnpaid] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnpaidPage(1);

    const [unpaidSettled, paidSettled] = await Promise.allSettled([
      listUnpaidDuesUseCase({ feesApi }, month, 1, UNPAID_PAGE_SIZE),
      listPaidDuesUseCase({ feesApi }, month),
    ]);

    if (!mountedRef.current) return;

    // Handle rejected promises (network failures, unexpected throws)
    if (unpaidSettled.status === 'rejected') {
      setError({ code: 'NETWORK', message: 'Failed to load unpaid dues.' });
      setLoading(false);
      return;
    }
    if (paidSettled.status === 'rejected') {
      setError({ code: 'NETWORK', message: 'Failed to load paid dues.' });
      setLoading(false);
      return;
    }

    const unpaidResult = unpaidSettled.value;
    const paidResult = paidSettled.value;

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

    setUnpaidItems(unpaidResult.value.items);
    setUnpaidTotal(unpaidResult.value.meta.total);
    setHasMoreUnpaid(unpaidResult.value.meta.page < unpaidResult.value.meta.totalPages);
    setPaidItems(paidResult.value);
    setLoading(false);
  }, [month, feesApi]);

  const fetchMoreUnpaid = useCallback(async () => {
    if (loading || loadingMoreUnpaid || !hasMoreUnpaid) return;
    const nextPage = unpaidPage + 1;
    setLoadingMoreUnpaid(true);

    const result = await listUnpaidDuesUseCase({ feesApi }, month, nextPage, UNPAID_PAGE_SIZE);

    if (!mountedRef.current) return;
    setLoadingMoreUnpaid(false);

    if (result.ok) {
      setUnpaidItems((prev) => [...prev, ...result.value.items]);
      setUnpaidPage(nextPage);
      setHasMoreUnpaid(result.value.meta.page < result.value.meta.totalPages);
    }
  }, [loading, loadingMoreUnpaid, hasMoreUnpaid, unpaidPage, feesApi, month]);

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

  return {
    unpaidItems,
    paidItems,
    loading,
    error,
    month,
    setMonth,
    refetch,
    unpaidTotal,
    hasMoreUnpaid,
    loadingMoreUnpaid,
    fetchMoreUnpaid,
  };
}
