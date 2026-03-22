import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type {
  DailyAttendanceItem,
  AttendanceStatus,
} from '../../domain/attendance/attendance.types';
import {
  getDailyAttendanceUseCase,
  type DailyAttendanceApiPort,
} from './use-cases/get-daily-attendance.usecase';
import {
  markAttendanceUseCase,
  type MarkAttendanceApiPort,
} from './use-cases/mark-attendance.usecase';
import { getTodayIST } from '../../domain/common/date-utils';

export type AttendanceApiPort = DailyAttendanceApiPort & MarkAttendanceApiPort;

type UseAttendanceResult = {
  items: DailyAttendanceItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  isHoliday: boolean;
  date: string;
  refetch: () => void;
  fetchMore: () => void;
  toggleStatus: (studentId: string) => void;
};

const PAGE_SIZE = 50;

export { getTodayIST };

export function useAttendance(
  date: string,
  attendanceApi: AttendanceApiPort,
  batchId?: string | null,
  search?: string | null,
): UseAttendanceResult {
  const [items, setItems] = useState<DailyAttendanceItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const mountedRef = useRef(true);
  const pendingTogglesRef = useRef(new Set<string>());
  const fetchingMoreRef = useRef(false);
  const loadRef = useRef<(targetPage: number, append: boolean) => Promise<void>>();

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getDailyAttendanceUseCase(
          { attendanceApi },
          date,
          targetPage,
          PAGE_SIZE,
          batchId ?? undefined,
          search ?? undefined,
        );

        if (!mountedRef.current) return;

        if (result.ok) {
          if (append) {
            setItems((prev) => [...prev, ...result.value.items]);
          } else {
            setItems(result.value.items);
            setIsHoliday(result.value.isHoliday);
          }
          setPage(targetPage);
          setHasMore(targetPage < result.value.meta.totalPages);
        } else {
          setError(result.error);
        }
      } catch (e) {
        if (__DEV__) console.error('[useAttendance] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Failed to load attendance. Pull to retry.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          fetchingMoreRef.current = false;
        }
      }
    },
    [date, attendanceApi, batchId, search],
  );

  // Keep ref in sync so refetch identity stays stable
  loadRef.current = load;

  const refetch = useCallback(() => {
    loadRef.current?.(1, false);
  }, []);

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true);
  }, [loading, loadingMore, hasMore, page, load]);

  const toggleStatus = useCallback(
    (studentId: string) => {
      if (isHoliday) return;
      if (pendingTogglesRef.current.has(studentId)) return;

      pendingTogglesRef.current.add(studentId);

      // Capture the current status and compute new status inside the updater
      // to avoid stale ref issues with rapid toggles
      let previousStatus: AttendanceStatus | null = null;
      let newStatus: AttendanceStatus | null = null;

      setItems((prev) => {
        const current = prev.find((i) => i.studentId === studentId);
        if (!current || current.status === 'HOLIDAY') {
          pendingTogglesRef.current.delete(studentId);
          return prev;
        }
        previousStatus = current.status as AttendanceStatus;
        newStatus = previousStatus === 'ABSENT' ? 'PRESENT' : 'ABSENT';
        return prev.map((item) =>
          item.studentId === studentId ? { ...item, status: newStatus! } : item,
        );
      });

      if (!newStatus || !previousStatus) {
        pendingTogglesRef.current.delete(studentId);
        return;
      }

      const capturedPrevious = previousStatus;
      const capturedNew = newStatus;

      markAttendanceUseCase({ attendanceApi }, studentId, date, capturedNew)
        .then((result) => {
          if (!mountedRef.current) return;
          if (!result.ok) {
            // Revert optimistic update
            setItems((prev) =>
              prev.map((item) =>
                item.studentId === studentId ? { ...item, status: capturedPrevious } : item,
              ),
            );
            setError(result.error);
          }
        })
        .catch((e) => {
          if (__DEV__) console.error('[useAttendance] Toggle failed:', e);
          if (mountedRef.current) {
            // Revert optimistic update
            setItems((prev) =>
              prev.map((item) =>
                item.studentId === studentId ? { ...item, status: capturedPrevious } : item,
              ),
            );
            setError({ code: 'NETWORK', message: 'Failed to save attendance change.' });
          }
        })
        .finally(() => {
          pendingTogglesRef.current.delete(studentId);
        });
    },
    [isHoliday, attendanceApi, date],
  );

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    isHoliday,
    date,
    refetch,
    fetchMore,
    toggleStatus,
  };
}
