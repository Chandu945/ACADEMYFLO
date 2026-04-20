import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { EnquiryListItem, EnquiryStatus } from '../../domain/enquiry/enquiry.types';
import { listEnquiriesUseCase, type EnquiryApiPort } from './use-cases/list-enquiries.usecase';
import { useAuth } from '../../presentation/context/AuthContext';

const PAGE_SIZE = 20;

type UseEnquiriesResult = {
  items: EnquiryListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  refetch: () => void;
  fetchMore: () => void;
};

export function useEnquiries(
  enquiryApi: EnquiryApiPort,
  status?: EnquiryStatus,
  search?: string,
  followUpToday?: boolean,
): UseEnquiriesResult {
  const [items, setItems] = useState<EnquiryListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);
  const fetchingMoreRef = useRef(false);
  // Monotonic counter to discard stale responses from superseded filter changes
  // (mirrors useStudents F3 fix).
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await listEnquiriesUseCase(
          { enquiryApi },
          { status, search, followUpToday, page: targetPage, limit: PAGE_SIZE },
        );

        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        if (result.ok) {
          if (append) {
            setItems((prev) => [...prev, ...result.value.items]);
          } else {
            setItems(result.value.items);
          }
          setPage(targetPage);
          setHasMore(targetPage < result.value.meta.totalPages);
        } else {
          setError(result.error);
        }
      } catch (e) {
        if (__DEV__) console.error('[useEnquiries] Load failed:', e);
        if (mountedRef.current && requestId === requestIdRef.current) {
          setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
        }
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enquiryApi, status, search, followUpToday],
  );

  const refetch = useCallback(() => {
    // Reset items + page so a post-mutation refetch reflects the current
    // filter cleanly (mirrors useStudents F3-H4 + useStaff F4-H4).
    setItems([]);
    setPage(1);
    setHasMore(true);
    load(1, false);
  }, [load]);

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true).finally(() => { fetchingMoreRef.current = false; });
  }, [loading, loadingMore, hasMore, page, load]);

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Cross-account safety: clear cached enquiry list when the authenticated
  // user changes (mirror useStudents F3-M1).
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const lastUserRef = useRef<string | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      setItems([]);
      setPage(1);
      setHasMore(true);
      setError(null);
    }
  }, [userId]);

  return { items, loading, loadingMore, error, hasMore, refetch, fetchMore };
}
