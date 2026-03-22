import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { StudentWiseDueItem } from '../../domain/reports/reports.types';
import { getStudentWiseDuesUseCase } from './use-cases/get-student-wise-dues.usecase';
import type { GetStudentWiseDuesApiPort } from './use-cases/get-student-wise-dues.usecase';

const PAGE_SIZE = 20;

type UsePendingDuesResult = {
  items: StudentWiseDueItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  total: number;
  refetch: () => void;
  fetchMore: () => void;
};

export function usePendingDues(
  api: GetStudentWiseDuesApiPort,
  month: string,
): UsePendingDuesResult {
  const [items, setItems] = useState<StudentWiseDueItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [total, setTotal] = useState(0);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getStudentWiseDuesUseCase(
          { reportsApi: api },
          month,
          targetPage,
          PAGE_SIZE,
        );

        if (!mountedRef.current) return;

        if (result.ok) {
          if (append) {
            setItems((prev) => [...prev, ...result.value.items]);
          } else {
            setItems(result.value.items);
          }
          setPage(targetPage);
          setTotal(result.value.meta.total);
          setHasMore(targetPage < result.value.meta.totalPages);
        } else {
          setError(result.error);
        }
      } catch (e) {
        if (__DEV__) console.error('[usePendingDues] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [api, month],
  );

  const refetch = useCallback(() => {
    load(1, false);
  }, [load]);

  const fetchMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      load(page + 1, true);
    }
  }, [loading, loadingMore, hasMore, page, load]);

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { items, loading, loadingMore, error, hasMore, total, refetch, fetchMore };
}
