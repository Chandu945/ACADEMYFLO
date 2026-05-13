import { GetEventDetailUseCase } from './get-event-detail.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
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
  return { userRepo, eventRepo };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new GetEventDetailUseCase(deps.userRepo, deps.eventRepo);
}

describe('GetEventDetailUseCase', () => {
  // M3 regression: status drift must be persisted via fire-and-forget save
  // so dashboard counts (countByAcademyAndMonth uses stored status) don't lag.
  it('M3: fires write-back when stored status is stale', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    // Past-dated event stored as UPCOMING → derived will be COMPLETED.
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

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    // Wait a tick for the fire-and-forget to fire.
    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.eventRepo.saveWithVersionPrecondition).toHaveBeenCalled();
    const [saved, expectedVersion] = deps.eventRepo.saveWithVersionPrecondition.mock.calls[0]!;
    expect(saved.status).toBe('COMPLETED');
    // The precondition must use the PRE-bump version (1), not the bumped one.
    expect(expectedVersion).toBe(pastEvent.audit.version);
  });

  it('M3: skips write-back when stored status matches derived', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    // Stored UPCOMING + future startDate → derived also UPCOMING. No drift.
    const futureEvent = CalendarEvent.create({
      id: 'event-1',
      academyId: 'academy-1',
      title: 'Future Event',
      startDate: new Date('2099-01-01'),
      isAllDay: true,
      status: 'UPCOMING',
      createdBy: 'owner-1',
    });
    deps.eventRepo.findById.mockResolvedValue(futureEvent);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.eventRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });

  it('M3: terminal statuses (CANCELLED, COMPLETED) skip the drift check', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const cancelled = CalendarEvent.create({
      id: 'event-1',
      academyId: 'academy-1',
      title: 'Cancelled Event',
      startDate: new Date('2099-01-01'),
      isAllDay: true,
      status: 'CANCELLED',
      createdBy: 'owner-1',
    });
    deps.eventRepo.findById.mockResolvedValue(cancelled);

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.eventRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });

  it('rejects when event is in a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    const evt = CalendarEvent.create({
      id: 'event-1',
      academyId: 'other-academy',
      title: 'Other',
      startDate: new Date('2026-01-01'),
      isAllDay: true,
      status: 'UPCOMING',
      createdBy: 'owner-other',
    });
    deps.eventRepo.findById.mockResolvedValue(evt);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(false);
  });
});
