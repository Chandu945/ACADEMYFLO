import { CreateEventUseCase } from './create-event.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';

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
    save: jest.fn().mockResolvedValue(undefined),
    saveWithVersionPrecondition: jest.fn(),
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
  return new CreateEventUseCase(deps.userRepo, deps.eventRepo, deps.audit);
}

const validInput = {
  actorUserId: 'owner-1',
  actorRole: 'OWNER' as const,
  title: 'Annual Day',
  startDate: '2026-05-10',
  isAllDay: true,
  eventType: 'ANNUAL_DAY' as const,
};

describe('CreateEventUseCase', () => {
  it('creates an event and records audit on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(true);
    expect(deps.eventRepo.save).toHaveBeenCalledTimes(1);
  });

  // M5 regression: audit context must contain title, startDate, and (when set)
  // eventType. Prior code passed an empty context, leaving audit log entries
  // as bare UUIDs with no clue what event was created.
  it('M5: audit context contains title, startDate, and eventType', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    await makeUc(deps).execute(validInput);

    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENT_CREATED',
        context: {
          title: 'Annual Day',
          startDate: '2026-05-10',
          eventType: 'ANNUAL_DAY',
        },
      }),
    );
  });

  it('M5: audit context omits eventType when not specified', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    await makeUc(deps).execute({ ...validInput, eventType: undefined });

    const call = deps.audit.record.mock.calls[0]![0];
    expect(call.context).toEqual({ title: 'Annual Day', startDate: '2026-05-10' });
  });

  it('rejects non-OWNER/STAFF roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({ ...validInput, actorRole: 'PARENT' });
    expect(result.ok).toBe(false);
    expect(deps.eventRepo.save).not.toHaveBeenCalled();
  });

  it('rejects when title is too short', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const result = await makeUc(deps).execute({ ...validInput, title: 'A' });
    expect(result.ok).toBe(false);
    expect(deps.eventRepo.save).not.toHaveBeenCalled();
  });

  it('rejects when endDate is before startDate', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const result = await makeUc(deps).execute({
      ...validInput,
      endDate: '2026-05-09', // before startDate
    });
    expect(result.ok).toBe(false);
    expect(deps.eventRepo.save).not.toHaveBeenCalled();
  });
});
