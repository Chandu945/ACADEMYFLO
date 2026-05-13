import { GetStudentBatchesUseCase } from './get-student-batches.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { Batch } from '@domain/batch/entities/batch.entity';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';

function createMockUser(): User {
  const user = User.create({
    id: 'user-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  return User.reconstitute('user-1', { ...user['props'], academyId: 'academy-1' });
}

function createMockStudent(): Student {
  return Student.create({
    id: 'student-1',
    academyId: 'academy-1',
    fullName: 'Test Student',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543211', email: 'parent@test.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 1000,
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
    // Default to empty so the use-case's `batches.map(...)` doesn't null-deref
    // for tests that don't seed batches. Per-case overrides set real values.
    findByIds: jest.fn().mockResolvedValue([]),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };

  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    // Default to empty so unseeded tests don't null-deref the .map() call in
    // the use-case. Tests that need real assignments override per-case.
    findByStudentId: jest.fn().mockResolvedValue([]),
    findByStudentIds: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn(),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn(),
    countByBatchIds: jest.fn().mockResolvedValue(new Map()),
  };

  return { userRepo, studentRepo, batchRepo, studentBatchRepo };
}

describe('GetStudentBatchesUseCase', () => {
  it('should return batches for a student', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.studentBatchRepo.findByStudentId.mockResolvedValue([
      StudentBatch.create({
        id: 'sb-1',
        studentId: 'student-1',
        batchId: 'batch-1',
        academyId: 'academy-1',
      }),
      StudentBatch.create({
        id: 'sb-2',
        studentId: 'student-1',
        batchId: 'batch-2',
        academyId: 'academy-1',
      }),
    ]);
    // Use-case batches the lookup into a single `findByIds(...)` call (was
    // per-id round-trips before the N+1 fix). Seed that method directly.
    deps.batchRepo.findByIds.mockResolvedValue([
      Batch.create({
        id: 'batch-1',
        academyId: 'academy-1',
        batchName: 'Batch batch-1',
        days: ['MON'],
      }),
      Batch.create({
        id: 'batch-2',
        academyId: 'academy-1',
        batchName: 'Batch batch-2',
        days: ['MON'],
      }),
    ]);

    const uc = new GetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  it('should return empty array when no batches assigned', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.studentBatchRepo.findByStudentId.mockResolvedValue([]);

    const uc = new GetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should return error for non-existent student', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.studentRepo.findById.mockResolvedValue(null);

    const uc = new GetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should return error for student in different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    const otherStudent = Student.create({
      id: 'student-1',
      academyId: 'other-academy',
      fullName: 'Other Student',
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
      guardian: { name: 'Parent', mobile: '+919876543211', email: 'parent@test.com' },
      joiningDate: new Date('2024-01-01'),
      monthlyFee: 1000,
    });
    deps.studentRepo.findById.mockResolvedValue(otherStudent);

    const uc = new GetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should return error for unauthorized role', async () => {
    const deps = buildDeps();

    const uc = new GetStudentBatchesUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
    );

    const result = await uc.execute({
      actorUserId: 'user-1',
      actorRole: 'SUPER_ADMIN',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});
