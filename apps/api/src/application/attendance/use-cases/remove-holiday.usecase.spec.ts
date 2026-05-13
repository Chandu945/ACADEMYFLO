import { RemoveHolidayUseCase } from './remove-holiday.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { User } from '@domain/identity/entities/user.entity';
import { Holiday } from '@domain/attendance/entities/holiday.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const u = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'h',
  });
  if (academyId) return User.reconstitute('owner-1', { ...u['props'], academyId });
  return u;
}

function createParent(id: string): User {
  const u = User.create({
    id,
    fullName: `Parent ${id}`,
    email: `${id}@e.com`,
    phoneNumber: '+919876500001',
    role: 'PARENT',
    passwordHash: 'h',
  });
  return User.reconstitute(id, { ...u['props'], academyId: 'academy-1' });
}

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn().mockResolvedValue({ users: [], total: 0 }),
    countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };
  const holidayRepo: jest.Mocked<HolidayRepository> = {
    save: jest.fn(),
    findByAcademyAndDate: jest.fn(),
    findByAcademyAndMonth: jest.fn(),
    deleteByAcademyAndDate: jest.fn().mockResolvedValue(undefined),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue({ academyName: 'Test Academy' } as unknown as never),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
  };
  const pushService = {
    sendToUsers: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PushNotificationService>;
  return { userRepo, holidayRepo, audit, academyRepo, pushService };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new RemoveHolidayUseCase(
    deps.userRepo,
    deps.holidayRepo,
    deps.audit,
    deps.academyRepo,
    deps.pushService,
  );
}

function createHoliday(): Holiday {
  return Holiday.create({
    id: 'hol-1',
    academyId: 'academy-1',
    date: '2026-05-14',
    reason: 'Mistake',
    declaredByUserId: 'owner-1',
  });
}

describe('RemoveHolidayUseCase', () => {
  it('removes holiday and audits when one exists', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(createHoliday());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(deps.holidayRepo.deleteByAcademyAndDate).toHaveBeenCalledWith('academy-1', '2026-05-14');
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'HOLIDAY_REMOVED' }),
    );
  });

  it('is idempotent — no audit if no holiday existed', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(deps.audit.record).not.toHaveBeenCalled();
    expect(deps.pushService.sendToUsers).not.toHaveBeenCalled();
  });

  // M4 regression: pushes parents that the holiday was cancelled, pairing
  // with the declare-holiday push so corrections reach parents.
  it('M4: pushes all parents in academy with HOLIDAY_REMOVED message', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(createHoliday());
    // M1 holidays-section fix: push fan-out now uses listParentIdsByAcademy
    // (ID-only, no pagination cap) instead of paginating listByAcademyAndRole.
    deps.userRepo.listParentIdsByAcademy.mockResolvedValue(['parent-1', 'parent-2']);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(deps.pushService.sendToUsers).toHaveBeenCalledTimes(1);
    const call = deps.pushService.sendToUsers.mock.calls[0]!;
    expect(call[0]).toEqual(['parent-1', 'parent-2']);
    expect(call[1]).toMatchObject({
      title: 'Holiday cancelled',
      data: expect.objectContaining({ type: 'HOLIDAY_REMOVED', date: '2026-05-14' }),
    });
  });

  it('M4: still succeeds when push throws (best-effort)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(createHoliday());
    deps.userRepo.listParentIdsByAcademy.mockResolvedValue(['parent-1']);
    deps.pushService.sendToUsers.mockRejectedValue(new Error('FCM down'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(deps.holidayRepo.deleteByAcademyAndDate).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalled();
  });

  it('rejects non-OWNER', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      date: '2026-05-14',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });
});
