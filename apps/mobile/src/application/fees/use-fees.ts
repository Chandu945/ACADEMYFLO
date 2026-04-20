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
  const fetchingMoreRef = useRef(false);
  // Deduplicate concurrent load() calls — protects against rapid refetch bursts
  // (focus cascades, effect double-fires) from fanning out into many page=1
  // requests + their pagination cascades.
  const loadInFlightRef = useRef(false);
  // Tracks the highest page already requested for the current month so
  // repeat fetchMoreUnpaid calls (onEndReached firing on web when the list
  // fits in viewport) become no-ops.
  const requestedPageRef = useRef(0);
  // Monotonic load id — every load() bumps it; if a stale load's results
  // resolve after a newer load has started, we discard them.
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const myId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    setUnpaidPage(1);
    requestedPageRef.current = 1;

    const [unpaidSettled, paidSettled] = await Promise.allSettled([
      listUnpaidDuesUseCase({ feesApi }, month, 1, UNPAID_PAGE_SIZE),
      listPaidDuesUseCase({ feesApi }, month),
    ]);

    loadInFlightRef.current = false;
    // Discard results from a load superseded by a newer one (e.g. month change).
    if (myId !== loadIdRef.current) return;
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
    // Deps omit *Ref.current reads — refs are stable identities. If any ref
    // is ever promoted to state, re-add it here.
  }, [month, feesApi]);

  const fetchMoreUnpaid = useCallback(async () => {
    if (fetchingMoreRef.current || loading || loadingMoreUnpaid || !hasMoreUnpaid) return;
    const nextPage = unpaidPage + 1;
    // Skip if we've already requested (or are requesting) this page — prevents
    // onEndReached from cascading rapid-fire duplicate fetches on web where
    // the list can fit entirely within the viewport.
    if (requestedPageRef.current >= nextPage) return;
    requestedPageRef.current = nextPage;
    fetchingMoreRef.current = true;
    setLoadingMoreUnpaid(true);

    try {
      const result = await listUnpaidDuesUseCase({ feesApi }, month, nextPage, UNPAID_PAGE_SIZE);

      if (!mountedRef.current) return;

      if (result.ok) {
        setUnpaidItems((prev) => [...prev, ...result.value.items]);
        setUnpaidPage(nextPage);
        setHasMoreUnpaid(result.value.meta.page < result.value.meta.totalPages);
      }
    } catch (e) {
      if (__DEV__) console.error('[useFees] fetchMoreUnpaid failed:', e);
    } finally {
      if (mountedRef.current) setLoadingMoreUnpaid(false);
      fetchingMoreRef.current = false;
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

  // Month change resets pagination immediately — even if a prior load is still
  // in flight, its results will be discarded via the loadIdRef check. Without
  // this, loadInFlightRef could block the new month's load and requestedPageRef
  // would point at the old month's last page.
  useEffect(() => {
    loadInFlightRef.current = false;
    fetchingMoreRef.current = false;
    requestedPageRef.current = 1;
    setUnpaidPage(1);
  }, [month]);

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
