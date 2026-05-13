import { DeclareHolidayUseCase } from './declare-holiday.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Academy } from '@domain/academy/entities/academy.entity';
import { Holiday } from '@domain/attendance/entities/holiday.entity';

/**
 * Today's date as YYYY-MM-DD. Previously these tests used a hardcoded
 * '2024-03-26'; once M2 added a holiday-date range check (within ±30d past /
 * +2yr future), that fixed date drifted out of the valid window. A dynamic
 * "today" stays valid regardless of when the suite runs.
 */
const TODAY = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
})();

function createOwner(academyId: string | null = 'academy-1'): User {
  const user = User.create({
    id: 'owner-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  if (academyId) {
    return User.reconstitute('owner-1', { ...user['props'], academyId });
  }
  return user;
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
  const holidayRepo: jest.Mocked<HolidayRepository> = {
    save: jest.fn(),
    findByAcademyAndDate: jest.fn(),
    deleteByAcademyAndDate: jest.fn(),
    findByAcademyAndMonth: jest.fn(),
  };
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
  };
  const auditRecorder = { record: jest.fn() };
  return { userRepo, holidayRepo, academyRepo, auditRecorder };
}

function createAcademy(id = 'academy-1', name = 'Sportsmart Academy'): Academy {
  return Academy.create({
    id,
    ownerUserId: 'owner-1',
    academyName: name,
    address: { line1: '1 St', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India' },
  });
}

describe('DeclareHolidayUseCase', () => {
  it('should declare a holiday successfully', async () => {
    const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

    const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: TODAY,
      reason: 'Republic Day',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.date).toBe(TODAY);
      expect(result.value.reason).toBe('Republic Day');
    }
    expect(holidayRepo.save).toHaveBeenCalled();
    // Note: attendance records are intentionally preserved when declaring a
    // holiday (so they can be restored if the holiday is later removed).
    // The attendanceRepo dependency was dropped from the use case (L4 fix)
    // since it had been unused since that cleanup change shipped.
  });

  it('should be idempotent when holiday already exists', async () => {
    const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    holidayRepo.findByAcademyAndDate.mockResolvedValue(
      Holiday.create({
        id: 'h-1',
        academyId: 'academy-1',
        date: TODAY,
        reason: 'Republic Day',
        declaredByUserId: 'owner-1',
      }),
    );

    const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: TODAY,
    });

    expect(result.ok).toBe(true);
    expect(holidayRepo.save).not.toHaveBeenCalled();
  });

  it('should reject STAFF from declaring holidays (403)', async () => {
    const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();

    const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      date: TODAY,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject when no academy', async () => {
    const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner(null));

    const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: TODAY,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ACADEMY_SETUP_REQUIRED');
    }
  });

  it('should reject invalid date', async () => {
    const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();

    const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
    userRepo.findById.mockResolvedValue(createOwner());

    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      date: 'invalid',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  describe('M2 + L6: holiday date-range validation', () => {
    function dateOffset(days: number): string {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    it('rejects a holiday more than 30 days in the past (typo guard)', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
      userRepo.findById.mockResolvedValue(createOwner());

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: dateOffset(-90),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION');
        expect(result.error.message).toContain('30 days in the past');
      }
      expect(holidayRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a holiday more than 2 years in the future (year-typo guard)', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
      userRepo.findById.mockResolvedValue(createOwner());

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: '2099-01-01',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION');
        expect(result.error.message).toContain('2 years in the future');
      }
      expect(holidayRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a holiday 1 year in the future (within planning window)', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
      userRepo.findById.mockResolvedValue(createOwner());
      holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: dateOffset(365),
      });

      expect(result.ok).toBe(true);
      expect(holidayRepo.save).toHaveBeenCalled();
    });
  });

  describe('M1 holidays-section fix: uncapped parent fan-out', () => {
    it('uses listParentIdsByAcademy (not paginated listByAcademyAndRole) so >1000 parents all receive the push', async () => {
      // Pre-fix code called listByAcademyAndRole(academyId, 'PARENT', 1, 1000),
      // silently capping the push at 1000 parents. A 1200-parent academy
      // would leave 200 parents in the dark — they'd show up to a closed
      // academy with no notification. The new path queries an ID-only,
      // unbounded list. This test simulates a 1500-parent academy to
      // prove the cap is gone.
      const { userRepo, holidayRepo, academyRepo } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
      academyRepo.findById.mockResolvedValue(createAcademy());
      const parentIds = Array.from({ length: 1500 }, (_, i) => `parent-${i}`);
      userRepo.listParentIdsByAcademy.mockResolvedValue(parentIds);
      // listByAcademyAndRole must NOT be the path used anymore — assert
      // we never call it as a regression guard.
      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };

      const uc = new DeclareHolidayUseCase(
        userRepo,
        holidayRepo,
        academyRepo,
        buildDeps().auditRecorder,
        pushService as never,
      );
      await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
        reason: 'Annual day',
      });

      expect(userRepo.listParentIdsByAcademy).toHaveBeenCalledWith('academy-1');
      expect(userRepo.listByAcademyAndRole).not.toHaveBeenCalled();
      expect(pushService.sendToUsers).toHaveBeenCalledTimes(1);
      expect(pushService.sendToUsers.mock.calls[0][0]).toHaveLength(1500);
    });
  });

  describe('M3: parent push on holiday declaration', () => {
    function makeParent(id: string) {
      return { id: { toString: () => id } } as never;
    }

    it('sends a holiday-declared push to all parents on first declare', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
      academyRepo.findById.mockResolvedValue(createAcademy('academy-1', 'Sportsmart'));
      // M1 holidays-section fix: push fan-out now uses listParentIdsByAcademy
      // (ID-only, no pagination cap) instead of paginating listByAcademyAndRole.
      userRepo.listParentIdsByAcademy.mockResolvedValue(['parent-1', 'parent-2']);

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = new DeclareHolidayUseCase(
        userRepo,
        holidayRepo,
        academyRepo,
        auditRecorder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushService as any,
      );

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
        reason: 'Inter-school tournament',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).toHaveBeenCalledTimes(1);
      expect(pushService.sendToUsers).toHaveBeenCalledWith(
        ['parent-1', 'parent-2'],
        expect.objectContaining({
          title: 'Holiday declared',
          body: expect.stringContaining('Sportsmart is closed'),
          data: expect.objectContaining({
            type: 'HOLIDAY_DECLARED',
            reason: 'Inter-school tournament',
          }),
        }),
      );
    });

    it('does NOT push on the idempotent already-exists path (avoids spam)', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      // Existing holiday — declare is a no-op idempotent return.
      holidayRepo.findByAcademyAndDate.mockResolvedValue(
        Holiday.create({
          id: 'h-existing',
          academyId: 'academy-1',
          date: TODAY,
          reason: 'Existing',
          declaredByUserId: 'owner-1',
        }),
      );

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = new DeclareHolidayUseCase(
        userRepo,
        holidayRepo,
        academyRepo,
        auditRecorder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushService as any,
      );

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
      });

      expect(result.ok).toBe(true);
      expect(holidayRepo.save).not.toHaveBeenCalled();
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('returns ok even when the push throws (best-effort delivery)', async () => {
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
      academyRepo.findById.mockResolvedValue(createAcademy());
      userRepo.listParentIdsByAcademy.mockResolvedValue(['parent-1']);

      const pushService = {
        sendToUsers: jest.fn().mockRejectedValue(new Error('FCM down')),
      };
      const uc = new DeclareHolidayUseCase(
        userRepo,
        holidayRepo,
        academyRepo,
        auditRecorder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushService as any,
      );

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
      });

      // Holiday saved successfully despite push failure.
      expect(result.ok).toBe(true);
      expect(holidayRepo.save).toHaveBeenCalled();
    });
  });

  describe('M4: concurrent declare race', () => {
    function makeParent(id: string) {
      return { id: { toString: () => id } } as never;
    }

    function dupErr() {
      return Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    }

    it("returns the racing winner's holiday idempotently when save hits duplicate-key", async () => {
      // Two owners (or owner-on-two-devices) declare the same date in
      // parallel. Both pass the existence check (record not yet committed),
      // both attempt insert. Second hits the unique index on (academy, date).
      // Without M4 this surfaced as 500 — with M4 the loser fetches the
      // winner's record and returns it cleanly.
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      // First findByAcademyAndDate (the pre-check) returns null; second one
      // (the post-error re-fetch) returns the racing winner's record.
      const winnerHoliday = Holiday.create({
        id: 'h-winner',
        academyId: 'academy-1',
        date: TODAY,
        reason: 'Diwali',
        declaredByUserId: 'owner-2',
      });
      holidayRepo.findByAcademyAndDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winnerHoliday);
      holidayRepo.save.mockRejectedValueOnce(dupErr());

      const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
        reason: 'Diwali',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The returned holiday is the racing winner's — not ours.
        expect(result.value.id).toBe('h-winner');
        expect(result.value.declaredByUserId).toBe('owner-2');
      }
    });

    it('does NOT trigger duplicate audit or push on the race-loser path', async () => {
      // The winner's call already recorded the audit and pushed parents.
      // The loser must not double-record or double-notify.
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      academyRepo.findById.mockResolvedValue(createAcademy());
      userRepo.listParentIdsByAcademy.mockResolvedValue(['parent-1']);

      const winnerHoliday = Holiday.create({
        id: 'h-winner',
        academyId: 'academy-1',
        date: TODAY,
        reason: null,
        declaredByUserId: 'owner-2',
      });
      holidayRepo.findByAcademyAndDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winnerHoliday);
      holidayRepo.save.mockRejectedValueOnce(dupErr());

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = new DeclareHolidayUseCase(
        userRepo,
        holidayRepo,
        academyRepo,
        auditRecorder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushService as any,
      );

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        date: TODAY,
      });

      expect(result.ok).toBe(true);
      // Loser path: no audit, no push.
      expect(auditRecorder.record).not.toHaveBeenCalled();
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('non-duplicate errors from save still propagate (defensive)', async () => {
      // Only error code 11000 is treated as a benign race. Other errors
      // (DB outage, validation failure) must still bubble.
      const { userRepo, holidayRepo, academyRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
      holidayRepo.save.mockRejectedValueOnce(new Error('Connection refused'));

      const uc = new DeclareHolidayUseCase(userRepo, holidayRepo, academyRepo, auditRecorder);
      await expect(
        uc.execute({
          actorUserId: 'owner-1',
          actorRole: 'OWNER',
          date: TODAY,
        }),
      ).rejects.toThrow('Connection refused');
    });
  });
});
