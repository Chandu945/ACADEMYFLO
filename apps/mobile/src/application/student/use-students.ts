import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { StudentListItem, StudentListFilters } from '../../domain/student/student.types';
import { listStudentsUseCase, type StudentApiPort } from './use-cases/list-students.usecase';

type UseStudentsResult = {
  items: StudentListItem[];
  totalItems: number;
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  refetch: () => void;
  fetchMore: () => void;
};

const PAGE_SIZE = 20;

export function useStudents(
  filters: StudentListFilters,
  studentApi: StudentApiPort,
): UseStudentsResult {
  const [items, setItems] = useState<StudentListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);
  // Monotonic counter to discard stale responses from superseded filter changes
  const requestIdRef = useRef(0);
  const fetchingMoreRef = useRef(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const requestId = ++requestIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let result;
      try {
        result = await listStudentsUseCase({ studentApi }, filters, targetPage, PAGE_SIZE);
      } catch (e) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setError({ code: 'UNKNOWN', message: 'Failed to load students. Pull to retry.' });
        setLoading(false);
        setLoadingMore(false);
        fetchingMoreRef.current = false;
        return;
      }

      // Discard stale response if filters changed while request was in flight
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      if (result.ok) {
        if (append) {
          setItems((prev) => [...prev, ...result.value.items]);
        } else {
          setItems(result.value.items);
        }
        setPage(targetPage);
        setTotalItems(result.value.meta.totalItems);
        setHasMore(targetPage < result.value.meta.totalPages);
      } else {
        setError(result.error);
      }

      setLoading(false);
      setLoadingMore(false);
      fetchingMoreRef.current = false;
    },
    [filters, studentApi],
  );

  const refetch = useCallback(() => {
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

  return { items, totalItems, loading, loadingMore, error, hasMore, refetch, fetchMore };
}
