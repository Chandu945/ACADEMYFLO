import { GetEventsUseCase } from './get-events.usecase';
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
    list: jest.fn().mockResolvedValue({ events: [], total: 0 }),
    delete: jest.fn(),
    countByAcademyAndMonth: jest.fn(),
  };
  return { userRepo, eventRepo };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new GetEventsUseCase(deps.userRepo, deps.eventRepo);
}

describe('GetEventsUseCase', () => {
  it('lists events with pagination on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    }
  });

  // M3 regression: when stored status has drifted from derived, fire-and-forget
  // a write-back so dashboard counts catch up.
  it('M3: write-back fires for each drifted event in the list', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const drifted1 = CalendarEvent.create({
      id: 'evt-1',
      academyId: 'academy-1',
      title: 'Past 1',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-02'),
      isAllDay: true,
      status: 'UPCOMING', // stored, but should be COMPLETED
      createdBy: 'owner-1',
    });
    const drifted2 = CalendarEvent.create({
      id: 'evt-2',
      academyId: 'academy-1',
      title: 'Past 2',
      startDate: new Date('2020-02-01'),
      endDate: new Date('2020-02-02'),
      isAllDay: true,
      status: 'UPCOMING',
      createdBy: 'owner-1',
    });
    const stable = CalendarEvent.create({
      id: 'evt-3',
      academyId: 'academy-1',
      title: 'Future',
      startDate: new Date('2099-01-01'),
      isAllDay: true,
      status: 'UPCOMING', // matches derived → no write-back
      createdBy: 'owner-1',
    });
    deps.eventRepo.list.mockResolvedValue({
      events: [drifted1, drifted2, stable],
      total: 3,
    });

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
    });

    // Allow the fire-and-forget allSettled to schedule.
    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.eventRepo.saveWithVersionPrecondition).toHaveBeenCalledTimes(2);
    // Every save targets status = COMPLETED for the drifted events.
    const savedStatuses = deps.eventRepo.saveWithVersionPrecondition.mock.calls.map(
      (c) => c[0].status,
    );
    expect(savedStatuses.every((s) => s === 'COMPLETED')).toBe(true);
  });

  it('M3: write-back is silent when save fails (does not throw)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.saveWithVersionPrecondition.mockRejectedValue(new Error('db blip'));
    deps.eventRepo.list.mockResolvedValue({
      events: [
        CalendarEvent.create({
          id: 'evt-1',
          academyId: 'academy-1',
          title: 'Past',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-02'),
          isAllDay: true,
          status: 'UPCOMING',
          createdBy: 'owner-1',
        }),
      ],
      total: 1,
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(true);
    // Even though saveWithVersionPrecondition throws, list response succeeds.
    await new Promise((resolve) => setImmediate(resolve));
    // No unhandled rejections should have crashed the test.
  });

  it('rejects non-OWNER/STAFF roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      page: 1,
      pageSize: 20,
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });
});
