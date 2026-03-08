import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { CalendarEvent, isValidStatusTransition, deriveEventStatus } from '@domain/event/entities/event.entity';
import type { EventStatus } from '@domain/event/entities/event.entity';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface ChangeEventStatusInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
  status: EventStatus;
}

export class ChangeEventStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(input: ChangeEventStatusInput): Promise<Result<Record<string, unknown>, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(EventErrors.statusChangeNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(EventErrors.notFound(input.eventId));
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    if (!isValidStatusTransition(event.status, input.status)) {
      return err(EventErrors.invalidStatusTransition(event.status, input.status));
    }

    // If reinstating from CANCELLED, recalculate based on dates
    let newStatus = input.status;
    if (event.status === 'CANCELLED' && input.status === 'UPCOMING') {
      newStatus = deriveEventStatus(event.startDate, event.endDate);
    }

    const updated = CalendarEvent.reconstitute(input.eventId, {
      academyId: event.academyId,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      location: event.location,
      targetAudience: event.targetAudience,
      batchIds: event.batchIds,
      status: newStatus,
      createdBy: event.createdBy,
      audit: updateAuditFields(event.audit),
    });

    await this.eventRepo.save(updated);

    return ok({
      id: updated.id.toString(),
      title: updated.title,
      status: updated.status,
      updatedAt: updated.audit.updatedAt.toISOString(),
    });
  }
}
