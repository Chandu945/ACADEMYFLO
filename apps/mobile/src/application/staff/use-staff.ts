import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { StaffListItem } from '../../domain/staff/staff.types';
import { listStaffUseCase, type StaffApiPort } from './use-cases/list-staff.usecase';
import { useAuth } from '../../presentation/context/AuthContext';

type UseStaffResult = {
  items: StaffListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  refetch: () => void;
  fetchMore: () => void;
};

const PAGE_SIZE = 20;

export function useStaff(staffApi: StaffApiPort): UseStaffResult {
  const [items, setItems] = useState<StaffListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);
  const fetchingMoreRef = useRef(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await listStaffUseCase({ staffApi }, targetPage, PAGE_SIZE);

        if (!mountedRef.current) return;

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
        if (__DEV__) console.error('[useStaff] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Failed to load staff. Pull to retry.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          fetchingMoreRef.current = false;
        }
      }
    },
    [staffApi],
  );

  const refetch = useCallback(() => {
    // Reset items + page state so a post-mutation refetch reflects the
    // current filter cleanly (mirrors useStudents F3-H4 fix).
    setItems([]);
    setPage(1);
    setHasMore(true);
    load(1, false);
  }, [load]);

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true);
  }, [loading, loadingMore, hasMore, page, load]);

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Cross-account safety: clear cached staff list when the authenticated
  // user changes (logout + login as a different owner). Mirror of
  // useStudents F3-M1.
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
