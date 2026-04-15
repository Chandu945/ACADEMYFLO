import type { CalendarEvent, EventStatus, EventType } from '../entities/event.entity';

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');

export interface EventListFilter {
  academyId: string;
  month?: string; // YYYY-MM
  status?: EventStatus;
  eventType?: EventType;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  /** Case-insensitive substring match on title or location. */
  search?: string;
}

export interface EventRepository {
  save(event: CalendarEvent): Promise<void>;
  findById(id: string): Promise<CalendarEvent | null>;
  list(
    filter: EventListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ events: CalendarEvent[]; total: number }>;
  delete(id: string): Promise<void>;
  countByAcademyAndMonth(
    academyId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<{ total: number; upcoming: number }>;
}
