import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type { EnquiryListItem, EnquiryStatus } from '../../domain/enquiry/enquiry.types';
import { listEnquiriesUseCase, type EnquiryApiPort } from './use-cases/list-enquiries.usecase';

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

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await listEnquiriesUseCase(
        { enquiryApi },
        { status, search, followUpToday, page: targetPage, limit: PAGE_SIZE },
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

      setLoading(false);
      setLoadingMore(false);
    },
    [enquiryApi, status, search, followUpToday],
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
