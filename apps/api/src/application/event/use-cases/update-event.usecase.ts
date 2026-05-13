import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { CalendarEvent, deriveEventStatus } from '@domain/event/entities/event.entity';
import type { EventType, TargetAudience } from '@domain/event/entities/event.entity';
import { EventErrors } from '../../common/errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserRole } from '@academyflo/contracts';

export interface UpdateEventInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
  title?: string;
  description?: string | null;
  eventType?: EventType | null;
  startDate?: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  location?: string | null;
  targetAudience?: TargetAudience | null;
  batchIds?: string[];
}

export class UpdateEventUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: UpdateEventInput): Promise<Result<Record<string, unknown>, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EventErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(EventErrors.notFound(input.eventId));
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    // Staff can only edit events they created
    if (input.actorRole === 'STAFF' && event.createdBy !== input.actorUserId) {
      return err(EventErrors.editNotAllowed());
    }

    const title = input.title?.trim() ?? event.title;
    if (title.length < 2) {
      return err(AppErrorClass.validation('Title must be at least 2 characters'));
    }

    const startDate = input.startDate ? new Date(input.startDate) : event.startDate;
    const endDate =
      input.endDate !== undefined
        ? input.endDate
          ? new Date(input.endDate)
          : null
        : event.endDate;

    if (endDate && endDate < startDate) {
      return err(EventErrors.invalidDateRange());
    }

    const isAllDay = input.isAllDay ?? event.isAllDay;
    const startTime = isAllDay
      ? null
      : input.startTime !== undefined
        ? input.startTime
        : event.startTime;
    const endTime = isAllDay ? null : input.endTime !== undefined ? input.endTime : event.endTime;

    if (!isAllDay && !startTime) {
      return err(EventErrors.missingStartTime());
    }

    if (startTime && endTime && !isAllDay) {
      const sameDay = !endDate || endDate.getTime() === startDate.getTime();
      if (sameDay && endTime <= startTime) {
        return err(EventErrors.invalidTimeRange());
      }
    }

    // Recalculate status if dates changed and status wasn't manually overridden
    let status = event.status;
    if (status !== 'CANCELLED') {
      status = deriveEventStatus(startDate, endDate);
    }

    const loadedVersion = event.audit.version;
    const updated = CalendarEvent.reconstitute(input.eventId, {
      academyId: event.academyId,
      title,
      description:
        input.description !== undefined
          ? (input.description?.trim().slice(0, 2000) ?? null)
          : event.description,
      eventType: input.eventType !== undefined ? input.eventType : event.eventType,
      startDate,
      endDate,
      startTime,
      endTime,
      isAllDay,
      location:
        input.location !== undefined
          ? (input.location?.trim().slice(0, 500) ?? null)
          : event.location,
      targetAudience:
        input.targetAudience !== undefined ? input.targetAudience : event.targetAudience,
      batchIds: input.batchIds ?? event.batchIds,
      status,
      createdBy: event.createdBy,
      audit: updateAuditFields(event.audit),
    });

    // M1 fix: compute the diff between the original event and the merged
    // `updated` entity so the audit log records WHICH fields changed (not
    // just "something changed"). For dispute resolution — "why did this
    // event's time move?" — this is the difference between a usable trail
    // and a useless one.
    const changedFields = diffChangedEventFields(event, updated);

    // No-op skip: if the request changed nothing (all input matches current
    // state, or only undefined values supplied), skip the save and the
    // audit. Avoids cluttering the audit log with empty-update entries.
    if (changedFields.length === 0) {
      return ok(toEventResponse(event));
    }

    const saved = await this.eventRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) return err(EventErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'EVENT_UPDATED',
      entityType: 'EVENT',
      entityId: updated.id.toString(),
      context: {
        title: event.title,
        changedFields: changedFields.join(','),
      },
    });

    return ok(toEventResponse(updated));
  }
}

function toEventResponse(event: CalendarEvent): Record<string, unknown> {
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
    status: event.status,
    createdBy: event.createdBy,
    createdAt: event.audit.createdAt.toISOString(),
    updatedAt: event.audit.updatedAt.toISOString(),
  };
}

/**
 * M1 helper: returns the list of user-driven fields that differ between the
 * original event and the merged update. Nullable fields normalised to null
 * before comparison so undefined vs null doesn't falsely register as a
 * change. Dates compared by getTime; arrays compared element-wise.
 *
 * Status is intentionally NOT included: status is not part of UpdateEventInput
 * (it's managed by change-event-status.usecase) and the only way it can
 * differ here is via the M3 drift recalculation on read. Auditing that as a
 * user-driven change would mislead a log reader into thinking the owner
 * manually changed the status. The drift correction still lands via the
 * save (when other fields also changed), or via the read-side M3 path
 * (get-events / get-event-detail) on the next access.
 */
function diffChangedEventFields(oldE: CalendarEvent, newE: CalendarEvent): string[] {
  const changed: string[] = [];
  if (oldE.title !== newE.title) changed.push('title');
  if ((oldE.description ?? null) !== (newE.description ?? null)) changed.push('description');
  if ((oldE.eventType ?? null) !== (newE.eventType ?? null)) changed.push('eventType');
  if (oldE.startDate.getTime() !== newE.startDate.getTime()) changed.push('startDate');
  const oldEnd = oldE.endDate?.getTime() ?? null;
  const newEnd = newE.endDate?.getTime() ?? null;
  if (oldEnd !== newEnd) changed.push('endDate');
  if ((oldE.startTime ?? null) !== (newE.startTime ?? null)) changed.push('startTime');
  if ((oldE.endTime ?? null) !== (newE.endTime ?? null)) changed.push('endTime');
  if (oldE.isAllDay !== newE.isAllDay) changed.push('isAllDay');
  if ((oldE.location ?? null) !== (newE.location ?? null)) changed.push('location');
  if ((oldE.targetAudience ?? null) !== (newE.targetAudience ?? null))
    changed.push('targetAudience');
  if (oldE.batchIds.length !== newE.batchIds.length) {
    changed.push('batchIds');
  } else {
    const oldSorted = [...oldE.batchIds].sort();
    const newSorted = [...newE.batchIds].sort();
    if (oldSorted.some((id, i) => id !== newSorted[i])) changed.push('batchIds');
  }
  return changed;
}
