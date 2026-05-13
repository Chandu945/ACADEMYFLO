import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { CalendarEvent, deriveEventStatus } from '@domain/event/entities/event.entity';
import { updateAuditFields } from '@shared/kernel';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

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
      const derived = deriveEventStatus(event.startDate, event.endDate);
      if (derived !== status) {
        status = derived;
        // M3 fix: fire-and-forget persist the corrected status so the
        // dashboard `countByAcademyAndMonth` (which uses stored status)
        // doesn't drift. Optimistic-locked; silent on miss.
        const expectedVersion = event.audit.version;
        const updated = CalendarEvent.reconstitute(event.id.toString(), {
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
          status: derived,
          createdBy: event.createdBy,
          audit: updateAuditFields(event.audit),
        });
        void this.eventRepo
          .saveWithVersionPrecondition(updated, expectedVersion)
          .catch(() => false);
      }
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
