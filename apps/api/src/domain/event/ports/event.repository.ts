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
  /**
   * Optimistic-concurrency save: persist only if the stored version equals
   * `expectedVersion`. Returns true on success, false on version mismatch.
   * Use for any mutation that loaded the event before saving (update,
   * status change) so two parallel edits don't silently overwrite.
   */
  saveWithVersionPrecondition(event: CalendarEvent, expectedVersion: number): Promise<boolean>;
  findById(id: string): Promise<CalendarEvent | null>;
  list(
    filter: EventListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ events: CalendarEvent[]; total: number }>;
  /**
   * Deletes the event only if it belongs to the given academy. Defense-in-
   * depth: the use-case layer already verifies ownership before calling,
   * but keying the delete by both id and academyId means a bug in a caller
   * cannot wipe another tenant's event.
   */
  delete(id: string, academyId: string): Promise<void>;
  countByAcademyAndMonth(
    academyId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<{ total: number; upcoming: number }>;
}
