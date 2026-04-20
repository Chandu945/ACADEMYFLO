import type {
  EventListItem,
  EventDetail,
  EventSummary,
  CreateEventRequest,
  UpdateEventRequest,
  EventListFilters,
  EventStatus,
} from '../../domain/event/event.types';
import {
  eventListResponseSchema,
  eventDetailSchema,
  eventSummarySchema,
  eventDeleteResponseSchema,
  type EventListApiResponse,
} from '../../domain/event/event.schemas';
import type { AppError } from '../../domain/common/errors';
import { err, ok, type Result } from '../../domain/common/result';
import { apiGet, apiPost, apiPut, apiDelete } from '../http/api-client';
import type { ZodSchema } from 'zod';

interface EventListResponse {
  data: EventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Same validateResponse pattern as student-api / staff-api / enquiry-api.
// Backend drift surfaces as a clear VALIDATION instead of `undefined.foo`
// crashes deep in event screens.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[eventApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
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

export async function listEvents(
  filters: EventListFilters,
  page: number,
  limit = 20,
): Promise<Result<EventListResponse, AppError>> {
  const result = await apiGet<unknown>(buildListPath(filters, page, limit));
  return validateResponse(
    eventListResponseSchema as unknown as ZodSchema<EventListApiResponse>,
    result,
    'listEvents',
  );
}

export async function getEventDetail(id: string): Promise<Result<EventDetail, AppError>> {
  const result = await apiGet<unknown>(`/api/v1/events/${encodeURIComponent(id)}`);
  return validateResponse(
    eventDetailSchema as unknown as ZodSchema<EventDetail>,
    result,
    'getEventDetail',
  );
}

export async function createEvent(req: CreateEventRequest): Promise<Result<EventDetail, AppError>> {
  const result = await apiPost<unknown>('/api/v1/events', req);
  return validateResponse(
    eventDetailSchema as unknown as ZodSchema<EventDetail>,
    result,
    'createEvent',
  );
}

export async function updateEvent(id: string, req: UpdateEventRequest): Promise<Result<EventDetail, AppError>> {
  const result = await apiPut<unknown>(`/api/v1/events/${encodeURIComponent(id)}`, req);
  return validateResponse(
    eventDetailSchema as unknown as ZodSchema<EventDetail>,
    result,
    'updateEvent',
  );
}

export async function deleteEvent(id: string): Promise<Result<{ deleted: boolean }, AppError>> {
  const result = await apiDelete<unknown>(`/api/v1/events/${encodeURIComponent(id)}`);
  return validateResponse(eventDeleteResponseSchema, result, 'deleteEvent');
}

export async function changeEventStatus(id: string, status: EventStatus): Promise<Result<EventDetail, AppError>> {
  const result = await apiPut<unknown>(`/api/v1/events/${encodeURIComponent(id)}/status`, { status });
  return validateResponse(
    eventDetailSchema as unknown as ZodSchema<EventDetail>,
    result,
    'changeEventStatus',
  );
}

export async function getEventSummary(): Promise<Result<EventSummary, AppError>> {
  const result = await apiGet<unknown>('/api/v1/events/summary');
  return validateResponse(
    eventSummarySchema as unknown as ZodSchema<EventSummary>,
    result,
    'getEventSummary',
  );
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
