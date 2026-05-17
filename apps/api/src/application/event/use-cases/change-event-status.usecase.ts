import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import {
  CalendarEvent,
  isValidStatusTransition,
  deriveEventStatus,
} from '@domain/event/entities/event.entity';
import type { EventStatus } from '@domain/event/entities/event.entity';

// Mirrors the response shape returned by update-event/get-event-detail so
// the mobile eventDetailSchema parses every event response uniformly. Prior
// behavior returned only id/title/status/updatedAt and the mobile parser
// surfaced "Unexpected server response" because the other ~11 fields were
// missing.
function toEventResponse(event: CalendarEvent, statusOverride?: EventStatus): Record<string, unknown> {
  return {
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
    status: statusOverride ?? event.status,
    createdBy: event.createdBy,
    createdAt: event.audit.createdAt.toISOString(),
    updatedAt: event.audit.updatedAt.toISOString(),
  };
}
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildEventCancelledPush } from '../../notifications/templates/event-cancelled-push-template';
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
    /**
     * Used to fan out a cancellation push to every parent linked to a
     * student in this academy (M2 fix). Optional so legacy fixtures keep
     * working — without it, the cancellation still persists but the push
     * is skipped. Production wiring always passes it.
     */
    private readonly parentLinkRepo?: ParentStudentLinkRepository,
    /**
     * Used to send the cancellation push (M2 fix). Best-effort: a push
     * failure must not roll back the status change.
     */
    private readonly pushService?: PushNotificationService,
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

    // M4 fix: same-status submission is a no-op success, not a validation
    // error. Prior behavior surfaced "Cannot change status from X to X"
    // which UI rendered as a hard failure even though nothing was being
    // changed. Matches the change-student-status pattern.
    if (event.status === input.status) {
      return ok(toEventResponse(event));
    }

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

    // M2 fix: when an event is cancelled, push every linked parent in the
    // academy. Cancellations are the most critical signal — parents who
    // mark a calendar entry need to know not to show up. Other status
    // transitions (UPCOMING → COMPLETED, CANCELLED → UPCOMING reinstate)
    // are intentionally not pushed for now: COMPLETED is automatic and
    // expected, reinstates are rare. Best-effort: a push failure leaves
    // the status change committed and audited.
    if (
      updated.status === 'CANCELLED' &&
      event.status !== 'CANCELLED' &&
      this.parentLinkRepo &&
      this.pushService
    ) {
      try {
        const links = await this.parentLinkRepo.findByAcademyId(actor.academyId);
        const parentUserIds = Array.from(new Set(links.map((l) => l.parentUserId)));
        if (parentUserIds.length > 0) {
          const message = buildEventCancelledPush({
            academyId: actor.academyId,
            eventId: input.eventId,
            eventTitle: event.title,
            eventStartDate: event.startDate,
          });
          await this.pushService.sendToUsers(parentUserIds, message);
        }
      } catch {
        // Swallow — status change is already saved + audited. Parents
        // will see the cancellation next time they open the events screen.
      }
    }

    return ok(toEventResponse(updated));
  }
}
