import type {
  EventListItem,
  EventDetail,
  EventSummary,
  CreateEventRequest,
  UpdateEventRequest,
  EventListFilters,
  EventStatus,
} from '../../domain/event/event.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../http/api-client';

interface EventListResponse {
  data: EventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildListPath(filters: EventListFilters, page: number, limit: number): string {
  const parts: string[] = [`page=${page}`, `limit=${limit}`];

  if (filters.month) parts.push(`month=${encodeURIComponent(filters.month)}`);
  if (filters.status) parts.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.eventType) parts.push(`eventType=${encodeURIComponent(filters.eventType)}`);
  if (filters.fromDate) parts.push(`fromDate=${encodeURIComponent(filters.fromDate)}`);
  if (filters.toDate) parts.push(`toDate=${encodeURIComponent(filters.toDate)}`);
  if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`);

  return `/api/v1/events?${parts.join('&')}`;
}

export function listEvents(
  filters: EventListFilters,
  page: number,
  limit = 20,
): Promise<Result<EventListResponse, AppError>> {
  return apiGet<EventListResponse>(buildListPath(filters, page, limit));
}

export function getEventDetail(id: string): Promise<Result<EventDetail, AppError>> {
  return apiGet<EventDetail>(`/api/v1/events/${id}`);
}

export function createEvent(req: CreateEventRequest): Promise<Result<EventDetail, AppError>> {
  return apiPost<EventDetail>('/api/v1/events', req);
}

export function updateEvent(id: string, req: UpdateEventRequest): Promise<Result<EventDetail, AppError>> {
  return apiPatch<EventDetail>(`/api/v1/events/${id}`, req);
}

export function deleteEvent(id: string): Promise<Result<{ deleted: boolean }, AppError>> {
  return apiDelete<{ deleted: boolean }>(`/api/v1/events/${id}`);
}

export function changeEventStatus(id: string, status: EventStatus): Promise<Result<EventDetail, AppError>> {
  return apiPut<EventDetail>(`/api/v1/events/${id}/status`, { status });
}

export function getEventSummary(): Promise<Result<EventSummary, AppError>> {
  return apiGet<EventSummary>('/api/v1/events/summary');
}

export const eventApi = {
  listEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  changeEventStatus,
  getEventSummary,
};
