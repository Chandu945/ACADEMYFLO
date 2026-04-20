import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppError } from '../../domain/common/errors';
import type {
  DailyStaffAttendanceItem,
  StaffAttendanceStatus,
} from '../../domain/staff-attendance/staff-attendance.types';
import {
  getDailyStaffAttendanceUseCase,
  type DailyStaffAttendanceApiPort,
} from './use-cases/get-daily-staff-attendance.usecase';
import {
  markStaffAttendanceUseCase,
  type MarkStaffAttendanceApiPort,
} from './use-cases/mark-staff-attendance.usecase';

export type StaffAttendanceApiPort = DailyStaffAttendanceApiPort & MarkStaffAttendanceApiPort;

type UseStaffAttendanceResult = {
  items: DailyStaffAttendanceItem[];
  loading: boolean;
  loadingMore: boolean;
  error: AppError | null;
  hasMore: boolean;
  date: string;
  isHoliday: boolean;
  refetch: () => void;
  fetchMore: () => void;
  toggleStatus: (staffUserId: string) => void;
};

const PAGE_SIZE = 50;

export function useStaffAttendance(
  date: string,
  staffAttendanceApi: StaffAttendanceApiPort,
): UseStaffAttendanceResult {
  const [items, setItems] = useState<DailyStaffAttendanceItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const mountedRef = useRef(true);
  const fetchingMoreRef = useRef(false);
  const pendingTogglesRef = useRef(new Set<string>());

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getDailyStaffAttendanceUseCase(
          { staffAttendanceApi },
          date,
          targetPage,
          PAGE_SIZE,
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
        if (__DEV__) console.error('[useStaffAttendance] Load failed:', e);
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
    [date, staffAttendanceApi],
  );

  const refetch = useCallback(() => {
    load(1, false);
  }, [load]);

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true).finally(() => { fetchingMoreRef.current = false; });
  }, [loading, loadingMore, hasMore, page, load]);

  const toggleStatus = useCallback(
    (staffUserId: string) => {
      // Staff attendance is allowed on holidays (API + web policy). We do NOT
      // block on isHoliday here — the UI should show a banner but not disable
      // the toggle.
      if (pendingTogglesRef.current.has(staffUserId)) return;

      pendingTogglesRef.current.add(staffUserId);

      let previousStatus: StaffAttendanceStatus | null = null;
      let newStatus: StaffAttendanceStatus | null = null;

      setItems((prev) => {
        const current = prev.find((i) => i.staffUserId === staffUserId);
        if (!current) {
          pendingTogglesRef.current.delete(staffUserId);
          return prev;
        }
        previousStatus = current.status as StaffAttendanceStatus;
        newStatus = previousStatus === 'ABSENT' ? 'PRESENT' : 'ABSENT';
        return prev.map((item) =>
          item.staffUserId === staffUserId ? { ...item, status: newStatus! } : item,
        );
      });

      if (!newStatus || !previousStatus) {
        pendingTogglesRef.current.delete(staffUserId);
        return;
      }

      const capturedPrevious = previousStatus;
      const capturedNew = newStatus;

      markStaffAttendanceUseCase({ staffAttendanceApi }, staffUserId, date, capturedNew)
        .then((result) => {
          if (!mountedRef.current) return;
          if (!result.ok) {
            setItems((prev) =>
              prev.map((item) =>
                item.staffUserId === staffUserId
                  ? { ...item, status: capturedPrevious }
                  : item,
              ),
            );
            setError(result.error);
            return;
          }
          // Reconcile with the server's authoritative status — matches the
          // student-attendance pattern. Optimistic prediction could disagree
          // with the server (race with another edit); reality wins.
          const serverStatus = result.value.status as StaffAttendanceStatus;
          if (serverStatus !== capturedNew) {
            setItems((prev) =>
              prev.map((item) =>
                item.staffUserId === staffUserId ? { ...item, status: serverStatus } : item,
              ),
            );
          }
        })
        .catch((e) => {
          if (__DEV__) console.error('[useStaffAttendance] Toggle failed:', e);
          if (!mountedRef.current) return;
          setItems((prev) =>
            prev.map((item) =>
              item.staffUserId === staffUserId ? { ...item, status: capturedPrevious } : item,
            ),
          );
          setError({ code: 'NETWORK', message: 'Failed to save attendance change.' });
        })
        .finally(() => {
          pendingTogglesRef.current.delete(staffUserId);
        });
    },
    [staffAttendanceApi, date],
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
    date,
    isHoliday,
    refetch,
    fetchMore,
    toggleStatus,
  };
}
