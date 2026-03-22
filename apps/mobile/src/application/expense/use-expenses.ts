import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { ExpenseItem } from '../../domain/expense/expense.types';
import { listExpensesUseCase, type ExpenseApiPort } from './use-cases/list-expenses.usecase';

type UseExpensesResult = {
  items: ExpenseItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  refetch: () => void;
  fetchMore: () => void;
};

const PAGE_SIZE = 20;

export function useExpenses(
  month: string,
  expenseApi: ExpenseApiPort,
  categoryId?: string,
  search?: string,
): UseExpensesResult {
  const [items, setItems] = useState<ExpenseItem[]>([]);
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
        const result = await listExpensesUseCase(
          { expenseApi },
          month,
          targetPage,
          PAGE_SIZE,
          categoryId,
          search,
        );

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
        if (__DEV__) console.error('[useExpenses] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Failed to load expenses. Pull to retry.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          fetchingMoreRef.current = false;
        }
      }
    },
    [expenseApi, month, categoryId, search],
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

  return { items, loading, loadingMore, error, hasMore, refetch, fetchMore };
}
