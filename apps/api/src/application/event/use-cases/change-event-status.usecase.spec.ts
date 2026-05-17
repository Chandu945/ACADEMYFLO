import { ChangeEventStatusUseCase } from './change-event-status.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { CalendarEvent } from '@domain/event/entities/event.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const base = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  if (academyId) return User.reconstitute('owner-1', { ...base['props'], academyId });
  return base;
}

function createEvent(
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING',
): CalendarEvent {
  return CalendarEvent.create({
    id: 'event-1',
    academyId: 'academy-1',
    title: 'Annual Day',
    startDate: new Date('2026-05-10'),
    isAllDay: true,
    status,
    createdBy: 'owner-1',
  });
}

function makeLink(parentUserId: string): ParentStudentLink {
  return ParentStudentLink.create({
    id: `link-${parentUserId}`,
    parentUserId,
    studentId: 'student-1',
    academyId: 'academy-1',
  });
}

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn(),
    countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };
  const eventRepo: jest.Mocked<EventRepository> = {
    save: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    countByAcademyAndMonth: jest.fn(),
  };
  const parentLinkRepo: jest.Mocked<ParentStudentLinkRepository> = {
    save: jest.fn(),
    findByParentAndStudent: jest.fn(),
    findByParentUserId: jest.fn(),
    findByStudentId: jest.fn(),
    findByAcademyId: jest.fn().mockResolvedValue([]),
    deleteByParentAndStudent: jest.fn(),
    deleteAllByParentUserId: jest.fn(),
    deleteAllByStudentId: jest.fn(),
  };
  const pushService = {
    sendToUsers: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PushNotificationService>;
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, eventRepo, parentLinkRepo, pushService, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new ChangeEventStatusUseCase(
    deps.userRepo,
    deps.eventRepo,
    deps.audit,
    deps.parentLinkRepo,
    deps.pushService,
  );
}

describe('ChangeEventStatusUseCase', () => {
  // M4 regression: same-status submission used to error "Cannot change from
  // UPCOMING to UPCOMING". Now it's an ok no-op (matches student-status pattern).
  it('M4: same-status submission is a no-op success', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'UPCOMING',
    });

    expect(result.ok).toBe(true);
    // Must NOT have triggered save or audit.
    expect(deps.eventRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // M2 regression: parents must be pushed when event is cancelled.
  it('M2: pushes all linked parents when status changes to CANCELLED', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));
    deps.parentLinkRepo.findByAcademyId.mockResolvedValue([
      makeLink('parent-1'),
      makeLink('parent-2'),
    ]);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'CANCELLED',
    });

    expect(result.ok).toBe(true);
    expect(deps.pushService.sendToUsers).toHaveBeenCalledTimes(1);
    const call = deps.pushService.sendToUsers.mock.calls[0]!;
    expect(call[0]).toEqual(['parent-1', 'parent-2']);
    expect(call[1]).toMatchObject({
      title: 'Event cancelled',
      data: expect.objectContaining({ type: 'EVENT_CANCELLED' }),
    });
  });

  it('M2: deduplicates parent userIds (one parent linked to two students)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));
    deps.parentLinkRepo.findByAcademyId.mockResolvedValue([
      makeLink('parent-1'),
      makeLink('parent-1'), // same parent, different student link
      makeLink('parent-2'),
    ]);

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'CANCELLED',
    });

    const call = deps.pushService.sendToUsers.mock.calls[0]!;
    expect(call[0]).toEqual(['parent-1', 'parent-2']); // deduped
  });

  it('M2: does NOT push on non-CANCELLED transitions', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));
    deps.parentLinkRepo.findByAcademyId.mockResolvedValue([makeLink('parent-1')]);

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'COMPLETED',
    });

    expect(deps.pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('M2: cancel still succeeds when push throws (best-effort)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));
    deps.parentLinkRepo.findByAcademyId.mockResolvedValue([makeLink('parent-1')]);
    deps.pushService.sendToUsers.mockRejectedValue(new Error('FCM down'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'CANCELLED',
    });

    expect(result.ok).toBe(true);
    // Save + audit completed despite push failure.
    expect(deps.eventRepo.saveWithVersionPrecondition).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalled();
  });

  // Regression: mobile validates this response against eventDetailSchema.
  // The previous payload was {id,title,status,updatedAt} only, which made
  // the Zod parse fail and surfaced "Unexpected server response" to the
  // user on every Mark Completed / Cancel Event / Reinstate tap.
  it('returns the full event detail payload (covers mobile schema parse)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'COMPLETED',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.value as Record<string, unknown>;
    // Every field the mobile eventDetailSchema requires must be present.
    // Optional event metadata (description, eventType, times, location,
    // targetAudience) defaults to null in the test fixture — assert key
    // presence so a missing key would still fail.
    const required = [
      'id', 'title', 'description', 'eventType',
      'startDate', 'endDate', 'startTime', 'endTime',
      'isAllDay', 'location', 'targetAudience', 'batchIds',
      'status', 'createdBy', 'createdAt', 'updatedAt',
    ];
    for (const key of required) {
      expect(payload).toHaveProperty(key);
    }
    expect(payload).toEqual(
      expect.objectContaining({
        id: 'event-1',
        title: 'Annual Day',
        startDate: expect.any(String),
        isAllDay: true,
        batchIds: expect.any(Array),
        status: 'COMPLETED',
        createdBy: 'owner-1',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('same-status no-op also returns the full payload', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('UPCOMING'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      status: 'UPCOMING',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.value as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        id: 'event-1',
        status: 'UPCOMING',
        startDate: expect.any(String),
        isAllDay: true,
        batchIds: expect.any(Array),
        createdBy: 'owner-1',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('rejects non-OWNER roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'STAFF',
      eventId: 'event-1',
      status: 'CANCELLED',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });
});
