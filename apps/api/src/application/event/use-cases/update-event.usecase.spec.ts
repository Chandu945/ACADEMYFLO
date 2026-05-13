import { UpdateEventUseCase } from './update-event.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { CalendarEvent } from '@domain/event/entities/event.entity';

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
  overrides: Partial<{ status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' }> = {},
): CalendarEvent {
  return CalendarEvent.create({
    id: 'event-1',
    academyId: 'academy-1',
    title: 'Annual Day',
    startDate: new Date('2026-05-10'),
    endDate: new Date('2026-05-10'),
    isAllDay: true,
    status: overrides.status ?? 'UPCOMING',
    createdBy: 'owner-1',
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
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, eventRepo, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UpdateEventUseCase(deps.userRepo, deps.eventRepo, deps.audit);
}

describe('UpdateEventUseCase', () => {
  // M1 regression: audit context must include `changedFields` listing only
  // the user-driven fields that changed. Prior code recorded an empty context.
  it('M1: records changed fields in audit context', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      title: 'Annual Day 2026',
      location: 'Main Hall',
    });

    expect(result.ok).toBe(true);
    const auditCall = deps.audit.record.mock.calls[0]![0];
    expect(auditCall.action).toBe('EVENT_UPDATED');
    const changedFields = auditCall.context?.['changedFields'] ?? '';
    expect(changedFields).toMatch(/title/);
    expect(changedFields).toMatch(/location/);
    // Should NOT include unchanged fields.
    expect(changedFields).not.toMatch(/description/);
    expect(changedFields).not.toMatch(/startDate/);
  });

  it('M1: no-op skip when nothing actually changed', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());

    // Caller passes only metadata fields, but no real change.
    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.eventRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // M1 + M3 interaction regression: when stored status has drifted (e.g.,
  // UPCOMING but date is in the past so derived is COMPLETED), an "empty"
  // update used to record audit with changedFields = 'status' — misleading
  // because the user didn't change status. The fix drops status from the
  // diff. If only status drifted, the no-op skip path triggers.
  it('M1+M3: status-only drift does NOT appear in changedFields', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    // Event was stored as UPCOMING but its dates are in the past — derived
    // status will be COMPLETED.
    const pastEvent = CalendarEvent.create({
      id: 'event-1',
      academyId: 'academy-1',
      title: 'Old Event',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-02'),
      isAllDay: true,
      status: 'UPCOMING',
      createdBy: 'owner-1',
    });
    deps.eventRepo.findById.mockResolvedValue(pastEvent);

    // Empty update — caller passes nothing.
    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    // No audit because changedFields is empty (status drift is invisible to
    // diff). The drift will get corrected by get-events / get-event-detail.
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('STAFF can edit only events they created', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue({
      ...createOwner(),
      role: 'STAFF',
    } as User);
    deps.eventRepo.findById.mockResolvedValue(createEvent());

    const result = await makeUc(deps).execute({
      actorUserId: 'staff-2',
      actorRole: 'STAFF',
      eventId: 'event-1',
      title: 'New Title',
    });

    expect(result.ok).toBe(false);
    expect(deps.eventRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });

  it('returns concurrency conflict when save loses the version race', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.eventRepo.saveWithVersionPrecondition.mockResolvedValue(false);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      title: 'Annual Day 2026',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });
});
