import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { BatchListItem } from '../../domain/batch/batch.types';
import { listBatchesUseCase, type BatchApiPort } from './use-cases/list-batches.usecase';

type UseBatchesResult = {
  items: BatchListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  refetch: () => void;
  fetchMore: () => void;
};

const PAGE_SIZE = 20;

export function useBatches(batchApi: BatchApiPort, search?: string): UseBatchesResult {
  const [items, setItems] = useState<BatchListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await listBatchesUseCase({ batchApi }, targetPage, PAGE_SIZE, search);

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

      setLoading(false);
      setLoadingMore(false);
    },
    [batchApi, search],
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

  return { items, loading, loadingMore, error, hasMore, refetch, fetchMore };
}
