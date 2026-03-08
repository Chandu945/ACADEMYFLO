import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { deriveEventStatus } from '@domain/event/entities/event.entity';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetEventDetailInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
}

export class GetEventDetailUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(input: GetEventDetailInput): Promise<Result<Record<string, unknown>, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EventErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(EventErrors.notFound(input.eventId));
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    let status = event.status;
    if (status !== 'CANCELLED' && status !== 'COMPLETED') {
      status = deriveEventStatus(event.startDate, event.endDate);
    }

    return ok({
      id: event.id.toString(),
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: event.startDate.toISOString().slice(0, 10),
      endDate: event.endDate?.toISOString().slice(0, 10) ?? null,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      location: event.location,
      targetAudience: event.targetAudience,
      batchIds: event.batchIds,
      status,
      createdBy: event.createdBy,
      createdAt: event.audit.createdAt.toISOString(),
      updatedAt: event.audit.updatedAt.toISOString(),
    });
  }
}
