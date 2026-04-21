import { RemoveStudentFromBatchUseCase } from './remove-student-from-batch.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { Batch } from '@domain/batch/entities/batch.entity';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';

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

function createMockBatch(academyId = 'academy-1'): Batch {
  return Batch.create({
    id: 'batch-1',
    academyId,
    batchName: 'Batch 1',
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
  };

  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
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
    findByIds: jest.fn(),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };

  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    findByStudentId: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn(),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn(),
    countByBatchIds: jest.fn().mockResolvedValue(new Map()),
  };

  return { userRepo, studentRepo, batchRepo, studentBatchRepo };
}

describe('RemoveStudentFromBatchUseCase', () => {
  function makeUc(deps: ReturnType<typeof buildDeps>) {
    return new RemoveStudentFromBatchUseCase(
      deps.userRepo,
      deps.batchRepo,
      deps.studentBatchRepo,
      deps.studentRepo,
    );
  }

  it('removes a student from a batch when both belong to the actor academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.batchRepo.findById.mockResolvedValue(createMockBatch());
    deps.studentRepo.findById.mockResolvedValue(createMockStudent());
    deps.studentBatchRepo.findByStudentId.mockResolvedValue([
      StudentBatch.create({ id: 'sb-1', studentId: 'student-1', batchId: 'batch-1', academyId: 'academy-1' }),
      StudentBatch.create({ id: 'sb-2', studentId: 'student-1', batchId: 'batch-2', academyId: 'academy-1' }),
    ]);

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalledWith(
      'student-1',
      expect.arrayContaining([expect.objectContaining({ batchId: 'batch-2' })]),
    );
    // batch-1 assignment should have been filtered out
    const [, remaining] = deps.studentBatchRepo.replaceForStudent.mock.calls[0]!;
    expect(remaining.find((a) => a.batchId === 'batch-1')).toBeUndefined();
  });

  // Regression guard for X2-C1: a malicious OWNER must not be able to pass a
  // studentId belonging to another academy and mutate that academy's
  // student_batch rows. Without the guard at remove-student-from-batch:52,
  // this scenario silently succeeded.
  it('rejects when student belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser('academy-1'));
    deps.batchRepo.findById.mockResolvedValue(createMockBatch('academy-1'));
    deps.studentRepo.findById.mockResolvedValue(createMockStudent('academy-other'));

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(deps.studentBatchRepo.replaceForStudent).not.toHaveBeenCalled();
  });

  it('rejects when the batch belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser('academy-1'));
    deps.batchRepo.findById.mockResolvedValue(createMockBatch('academy-other'));
    deps.studentRepo.findById.mockResolvedValue(createMockStudent('academy-1'));

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.studentBatchRepo.replaceForStudent).not.toHaveBeenCalled();
  });

  it('rejects PARENT role', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'PARENT',
      batchId: 'batch-1',
      studentId: 'student-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects actor without academyId', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser(null));
    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-1',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-existent student', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createMockUser());
    deps.batchRepo.findById.mockResolvedValue(createMockBatch());
    deps.studentRepo.findById.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.studentBatchRepo.replaceForStudent).not.toHaveBeenCalled();
  });
});
