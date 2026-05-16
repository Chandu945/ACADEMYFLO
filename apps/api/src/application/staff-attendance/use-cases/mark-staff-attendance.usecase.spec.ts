import { MarkStaffAttendanceUseCase } from './mark-staff-attendance.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import { User } from '@domain/identity/entities/user.entity';
import { StaffAttendance } from '@domain/staff-attendance/entities/staff-attendance.entity';

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const TODAY = todayStr();

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

function createStaff(
  id = 'staff-1',
  academyId = 'academy-1',
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
): User {
  const user = User.create({
    id,
    fullName: 'Test Staff',
    email: `${id}@example.com`,
    phoneNumber: '+919876543211',
    role: 'STAFF',
    passwordHash: 'hashed',
  });
  return User.reconstitute(id, { ...user['props'], academyId, status });
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
  const staffAttendanceRepo: jest.Mocked<StaffAttendanceRepository> = {
    save: jest.fn(),
    deleteByAcademyStaffDate: jest.fn(),
    findPresentByAcademyAndDate: jest.fn(),
    findPresentByAcademyDateAndStaffIds: jest.fn().mockResolvedValue([]),
    findPresentByAcademyAndMonth: jest.fn(),
    countPresentByAcademyStaffAndMonth: jest.fn(),
  };
  const auditRecorder = { record: jest.fn() };
  return { userRepo, staffAttendanceRepo, auditRecorder };
}

describe('MarkStaffAttendanceUseCase', () => {
  // Absence-only model: records mean PRESENT. Absence = no record.
  it('should create a present record when marking PRESENT', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PRESENT');
      expect(result.value.staffUserId).toBe('staff-1');
      expect(result.value.date).toBe(TODAY);
    }
    expect(staffAttendanceRepo.save).toHaveBeenCalled();
  });

  it('M1: concurrent PRESENT marks succeed idempotently when save hits duplicate-key', async () => {
    // Two owners on different devices tap "Present" on the same staff
    // member within milliseconds. Both pass the existence check (record not
    // yet committed), both try to insert. The second insert hits the
    // unique index on (academyId, staffUserId, date) and Mongo throws a
    // duplicate-key error (code 11000). Without M1 this surfaced as a 500;
    // with M1 it's treated as idempotent success.
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });
    // Existence check returns empty — race window open.
    staffAttendanceRepo.findPresentByAcademyDateAndStaffIds.mockResolvedValue([]);
    const dupErr = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    staffAttendanceRepo.save.mockRejectedValueOnce(dupErr);

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PRESENT');
    }
  });

  it('M1: non-duplicate errors from save still propagate (not swallowed)', async () => {
    // Defensive: only error code 11000 is treated as idempotent. Other
    // errors (real DB outage, validation failure, etc.) must still bubble.
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });
    staffAttendanceRepo.findPresentByAcademyDateAndStaffIds.mockResolvedValue([]);
    staffAttendanceRepo.save.mockRejectedValueOnce(new Error('Connection refused'));

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    await expect(
      uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        staffUserId: 'staff-1',
        date: TODAY,
        status: 'PRESENT',
      }),
    ).rejects.toThrow('Connection refused');
  });

  it('should delete the present record when marking ABSENT', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });
    // BUG-036: the use case only deletes when a row actually exists,
    // mirroring the audit-noop guard. Spec was previously asserting delete
    // was called even with the default empty mock — that path now no-ops.
    staffAttendanceRepo.findPresentByAcademyDateAndStaffIds.mockResolvedValue([
      StaffAttendance.create({
        id: 'att-1',
        academyId: 'academy-1',
        staffUserId: 'staff-1',
        date: TODAY,
        markedByUserId: 'owner-1',
      }),
    ]);

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(true);
    expect(staffAttendanceRepo.deleteByAcademyStaffDate).toHaveBeenCalledWith(
      'academy-1',
      'staff-1',
      TODAY,
    );
    expect(auditRecorder.record).toHaveBeenCalledTimes(1);
  });

  // BUG-036 regression guard: marking ABSENT when no PRESENT row exists is
  // a no-op. Previously the use case still wrote an audit row, polluting the
  // owner-facing audit feed with thousands of empty events.
  it('BUG-036: ABSENT with no existing record is a no-op (no delete, no audit)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });
    // Default mock already returns [] — no existing PRESENT row.

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(true);
    expect(staffAttendanceRepo.deleteByAcademyStaffDate).not.toHaveBeenCalled();
    expect(auditRecorder.record).not.toHaveBeenCalled();
  });

  // BUG-036 regression guard: marking PRESENT when already PRESENT is also
  // a no-op.
  it('BUG-036: PRESENT when already PRESENT is a no-op (no save, no audit)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff();
      return null;
    });
    staffAttendanceRepo.findPresentByAcademyDateAndStaffIds.mockResolvedValue([
      StaffAttendance.create({
        id: 'att-1',
        academyId: 'academy-1',
        staffUserId: 'staff-1',
        date: TODAY,
        markedByUserId: 'owner-1',
      }),
    ]);

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(true);
    expect(staffAttendanceRepo.save).not.toHaveBeenCalled();
    expect(auditRecorder.record).not.toHaveBeenCalled();
  });

  // BUG-037 regression guard: write-side rejects past-date marking for a
  // staff member whose startDate is after the target date.
  it('BUG-037: rejects marking for dates before staff startDate', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    const staffWithStart = (() => {
      const base = createStaff();
      // Reach for the entity's internal props to inject startDate after
      // construction — the public Staff API doesn't expose a setter.
      const props = (base as unknown as { props: Record<string, unknown> }).props;
      return User.reconstitute('staff-1', {
        ...(props as Parameters<typeof User.reconstitute>[1]),
        startDate: new Date('2026-06-01T00:00:00Z'),
      });
    })();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return staffWithStart;
      return null;
    });

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: '2026-05-15', // before startDate
      status: 'PRESENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
    expect(staffAttendanceRepo.save).not.toHaveBeenCalled();
    expect(auditRecorder.record).not.toHaveBeenCalled();
  });

  it('should reject STAFF role from marking staff attendance (FORBIDDEN)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      staffUserId: 'staff-2',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject cross-academy marking (FORBIDDEN)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner('academy-1');
      if (id === 'staff-1') return createStaff('staff-1', 'academy-2');
      return null;
    });

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject marking for inactive staff (CONFLICT)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff('staff-1', 'academy-1', 'INACTIVE');
      return null;
    });

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('should reject staff not found (NOT_FOUND)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'owner-1') return createOwner();
      return null;
    });

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-999',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should reject invalid date format (VALIDATION_ERROR)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: 'bad-date',
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('should reject owner without academy (ACADEMY_SETUP_REQUIRED)', async () => {
    const { userRepo, staffAttendanceRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner(null));

    const uc = new MarkStaffAttendanceUseCase(userRepo, staffAttendanceRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      staffUserId: 'staff-1',
      date: TODAY,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ACADEMY_SETUP_REQUIRED');
    }
  });
});
