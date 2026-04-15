import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository, EventListFilter } from '@domain/event/ports/event.repository';
import { deriveEventStatus } from '@domain/event/entities/event.entity';
import type { EventStatus, EventType } from '@domain/event/entities/event.entity';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetEventsInput {
  actorUserId: string;
  actorRole: UserRole;
  month?: string;
  status?: EventStatus;
  eventType?: EventType;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface EventListItemOutput {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  targetAudience: string | null;
  batchIds: string[];
  status: string;
  createdBy: string;
  createdAt: string;
}

export class GetEventsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(input: GetEventsInput): Promise<Result<{ data: EventListItemOutput[]; pagination: { page: number; limit: number; total: number; totalPages: number } }, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EventErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    const filter: EventListFilter = {
      academyId: actor.academyId,
      month: input.month,
      status: input.status,
      eventType: input.eventType,
      fromDate: input.fromDate,
      toDate: input.toDate,
      search: input.search?.trim() || undefined,
    };

    const { events, total } = await this.eventRepo.list(filter, input.page, input.pageSize);

    // Lazy status recalculation
    const data: EventListItemOutput[] = events.map((e) => {
      let status = e.status;
      if (status !== 'CANCELLED' && status !== 'COMPLETED') {
        const derived = deriveEventStatus(e.startDate, e.endDate);
        if (derived !== status) {
          status = derived;
          // Write-back could be done here but skipping for simplicity
        }
      }
      return {
        id: e.id.toString(),
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: e.startDate.toISOString().slice(0, 10),
        endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
        startTime: e.startTime,
        endTime: e.endTime,
        isAllDay: e.isAllDay,
        location: e.location,
        targetAudience: e.targetAudience,
        batchIds: e.batchIds,
        status,
        createdBy: e.createdBy,
        createdAt: e.audit.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / input.pageSize);

    return ok({
      data,
      pagination: { page: input.page, limit: input.pageSize, total, totalPages },
    });
  }
}
