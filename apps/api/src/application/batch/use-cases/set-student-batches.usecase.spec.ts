import { SetStudentBatchesUseCase } from './set-student-batches.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { Batch } from '@domain/batch/entities/batch.entity';

function createMockUser(academyId: string | null = 'academy-1'): User {
  const user = User.create({
    id: 'user-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  if (academyId) {
    return User.reconstitute('user-1', { ...user['props'], academyId });
  }
  return user;
}

function createMockStudent(academyId = 'academy-1'): Student {
  return Student.create({
    id: 'student-1',
    academyId,
    fullName: 'Test Student',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543211', email: 'parent@test.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 1000,
  });
}

function createMockBatch(id: string, academyId = 'academy-1'): Batch {
  return Batch.create({
    id,
    academyId,
    batchName: `Batch ${id}`,
    days: ['MON', 'WED'],
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

  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    countScheduledStudentsByAcademyAndDate: jest.fn().mockResolvedValue(0),
    findByIds: jest.fn(),
    findBirthdaysByAcademy: jest.fn(),
    findByEmailInAcademy: jest.fn(),
    findByPhoneInAcademy: jest.fn(),
    countInactiveByAcademy: jest.fn(),
    countNewAdmissionsByAcademyAndDateRange: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
  };

  const batchRepo: jest.Mocked<BatchRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    // Default to empty so use-case `batches.map(...)` doesn't null-deref when
    // a test exercises the "no batches selected" path. Per-case tests with
    // actual batchIds override this with the matching `Batch[]` payload.
    findByIds: jest.fn().mockResolvedValue([]),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };

  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    // Default to empty so the use-case's `currentAssignments.map(...)` doesn't
    // null-deref in any test that doesn't explicitly seed assignments. Tests
    // that exercise the "existing assignments" path override this per-case.
    findByStudentId: jest.fn().mockResolvedValue([]),
    findByStudentIds: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn(),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn(),
    countByBatchIds: jest.fn().mockResolvedValue(new Map()),
  };

  const transaction = { run: <T>(fn: () => Promise<T>) => fn() };

  return { userRepo, studentRepo, batchRepo, studentBatchRepo, transaction };
}

describe('SetStudentBatchesUseCase', () => {
  it('should assign batches to a student', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.batchRepo.findByIds.mockImplementation(async (ids) =>
      ids.map((id) => createMockBatch(id)),
    );

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchIds: ['batch-1', 'batch-2'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalledWith(
      'student-1',
      expect.any(Array),
    );
  });

  it('should deduplicate batch IDs', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.batchRepo.findByIds.mockImplementation(async (ids) =>
      ids.map((id) => createMockBatch(id)),
    );

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchIds: ['batch-1', 'batch-1'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it('should return error for non-existent student', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(null);

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchIds: ['batch-1'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should return error for batch not in academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.batchRepo.findByIds.mockResolvedValue([createMockBatch('batch-1', 'other-academy')]);

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchIds: ['batch-1'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('should return error for unauthorized role', async () => {
    const deps = buildDeps();

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'SUPER_ADMIN',
      studentId: 'student-1',
      batchIds: ['batch-1'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should allow empty batchIds to clear assignments', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());

    const uc = new SetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.transaction,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchIds: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalledWith('student-1', []);
  });

  describe('M3: audit log for batch reassignment', () => {
    function makeExistingAssignment(batchId: string) {
      // Shape-compatible stand-in — the diff logic only reads `.batchId`.
      return { batchId } as never;
    }

    it('records STUDENT_BATCHES_CHANGED audit with added and removed batch IDs', async () => {
      const deps = buildDeps();
      deps.userRepo.findById.mockResolvedValue(createMockUser());
      deps.studentRepo.findById.mockResolvedValue(createMockStudent());
      deps.batchRepo.findByIds.mockImplementation(async (ids) =>
        ids.map((id) => createMockBatch(id)),
      );
      // Student currently in batch-1 and batch-2. We're setting to batch-2 and batch-3.
      // Diff: added=batch-3, removed=batch-1.
      deps.studentBatchRepo.findByStudentId.mockResolvedValue([
        makeExistingAssignment('batch-1'),
        makeExistingAssignment('batch-2'),
      ]);

      const auditRecorder = { record: jest.fn() };
      const uc = new SetStudentBatchesUseCase(
        deps.userRepo,
        deps.studentRepo,
        deps.batchRepo,
        deps.studentBatchRepo,
        deps.transaction,
        auditRecorder,
      );

      const result = await uc.execute({
        actorUserId: 'user-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        batchIds: ['batch-2', 'batch-3'],
      });

      expect(result.ok).toBe(true);
      expect(auditRecorder.record).toHaveBeenCalledTimes(1);
      const call = auditRecorder.record.mock.calls[0]![0];
      expect(call.action).toBe('STUDENT_BATCHES_CHANGED');
      expect(call.entityId).toBe('student-1');
      expect(call.context.addedBatchIds).toBe('batch-3');
      expect(call.context.removedBatchIds).toBe('batch-1');
    });

    it('skips audit when no batches actually changed (no-op set)', async () => {
      const deps = buildDeps();
      deps.userRepo.findById.mockResolvedValue(createMockUser());
      deps.studentRepo.findById.mockResolvedValue(createMockStudent());
      deps.batchRepo.findByIds.mockImplementation(async (ids) =>
        ids.map((id) => createMockBatch(id)),
      );
      // Student is already in batch-1 and batch-2. Request sets the same.
      deps.studentBatchRepo.findByStudentId.mockResolvedValue([
        makeExistingAssignment('batch-1'),
        makeExistingAssignment('batch-2'),
      ]);

      const auditRecorder = { record: jest.fn() };
      const uc = new SetStudentBatchesUseCase(
        deps.userRepo,
        deps.studentRepo,
        deps.batchRepo,
        deps.studentBatchRepo,
        deps.transaction,
        auditRecorder,
      );

      const result = await uc.execute({
        actorUserId: 'user-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        batchIds: ['batch-1', 'batch-2'],
      });

      expect(result.ok).toBe(true);
      expect(auditRecorder.record).not.toHaveBeenCalled();
    });

    it('records empty string on the unaffected side (only-added case)', async () => {
      // Student had no batches. Adding two — addedBatchIds is populated;
      // removedBatchIds is empty string.
      const deps = buildDeps();
      deps.userRepo.findById.mockResolvedValue(createMockUser());
      deps.studentRepo.findById.mockResolvedValue(createMockStudent());
      deps.batchRepo.findByIds.mockImplementation(async (ids) =>
        ids.map((id) => createMockBatch(id)),
      );
      deps.studentBatchRepo.findByStudentId.mockResolvedValue([]);

      const auditRecorder = { record: jest.fn() };
      const uc = new SetStudentBatchesUseCase(
        deps.userRepo,
        deps.studentRepo,
        deps.batchRepo,
        deps.studentBatchRepo,
        deps.transaction,
        auditRecorder,
      );

      const result = await uc.execute({
        actorUserId: 'user-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        batchIds: ['batch-1', 'batch-2'],
      });

      expect(result.ok).toBe(true);
      const call = auditRecorder.record.mock.calls[0]![0];
      expect(call.context.addedBatchIds).toBe('batch-1,batch-2');
      expect(call.context.removedBatchIds).toBe('');
    });
  });
});
