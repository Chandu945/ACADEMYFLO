import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { CalendarEvent, isValidStatusTransition, deriveEventStatus } from '@domain/event/entities/event.entity';
import type { EventStatus } from '@domain/event/entities/event.entity';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

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
    private readonly auditRecorder: AuditRecorderPort,
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

    const loadedVersion = event.audit.version;
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

    const saved = await this.eventRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) return err(EventErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'EVENT_STATUS_CHANGED',
      entityType: 'EVENT',
      entityId: input.eventId,
      context: {
        title: event.title,
        fromStatus: event.status,
        toStatus: updated.status,
      },
    });

    return ok({
      id: updated.id.toString(),
      title: updated.title,
      status: updated.status,
      updatedAt: updated.audit.updatedAt.toISOString(),
    });
  }
}
