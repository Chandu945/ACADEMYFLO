import { AddStudentToBatchUseCase } from './add-student-to-batch.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { Batch } from '@domain/batch/entities/batch.entity';
import { Student } from '@domain/student/entities/student.entity';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';

function createOwner(): User {
  const u = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'h',
  });
  return User.reconstitute('owner-1', { ...u['props'], academyId: 'academy-1' });
}

function createBatch(maxStudents: number | null = null): Batch {
  return Batch.create({
    id: 'batch-1',
    academyId: 'academy-1',
    batchName: 'Morning Batch',
    maxStudents,
  });
}

function createStudent(id = 'student-new'): Student {
  return Student.create({
    id,
    academyId: 'academy-1',
    fullName: 'Test Student',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '1 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543299', email: 'p@e.com' },
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
  const batchRepo: jest.Mocked<BatchRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn().mockResolvedValue(undefined),
    findByStudentId: jest.fn().mockResolvedValue([]),
    findByStudentIds: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn().mockResolvedValue([]),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn().mockResolvedValue(0),
    countByBatchIds: jest.fn(),
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
    saveWithVersionPrecondition: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, batchRepo, studentBatchRepo, studentRepo, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new AddStudentToBatchUseCase(
    deps.userRepo,
    deps.batchRepo,
    deps.studentBatchRepo,
    deps.studentRepo,
    deps.audit,
  );
}

describe('AddStudentToBatchUseCase', () => {
  it('adds a student to the batch on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    deps.studentRepo.findById.mockResolvedValue(createStudent());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-new',
    });

    expect(result.ok).toBe(true);
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalled();
  });

  // M1 regression: BATCH_STUDENT_ADDED audit fires.
  it('M1: records BATCH_STUDENT_ADDED audit', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    deps.studentRepo.findById.mockResolvedValue(createStudent());

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-new',
    });

    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BATCH_STUDENT_ADDED',
        entityType: 'BATCH',
        entityId: 'batch-1',
        context: expect.objectContaining({
          batchName: 'Morning Batch',
          studentId: 'student-new',
          studentName: 'Test Student',
        }),
      }),
    );
  });

  // H3 regression: late racer (at index >= MAX after sort) rolls back its
  // own insert. Pre-fix would have both racers keeping their slots →
  // batch ends up over capacity.
  it('H3: late racer at index >= MAX rolls back, returns capacity full', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch(3)); // max 3
    deps.studentRepo.findById.mockResolvedValue(createStudent('student-late'));
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(2); // pre-flight passes
    // After our insert: 4 records. Our `student-late` was just inserted
    // (latest assignedAt). Other 3 were earlier.
    const baseTime = new Date('2026-01-01').getTime();
    const earlier1 = StudentBatch.reconstitute('sb-1', {
      studentId: 's1',
      batchId: 'batch-1',
      academyId: 'academy-1',
      assignedAt: new Date(baseTime + 1),
    });
    const earlier2 = StudentBatch.reconstitute('sb-2', {
      studentId: 's2',
      batchId: 'batch-1',
      academyId: 'academy-1',
      assignedAt: new Date(baseTime + 2),
    });
    const earlier3 = StudentBatch.reconstitute('sb-3', {
      studentId: 's3',
      batchId: 'batch-1',
      academyId: 'academy-1',
      assignedAt: new Date(baseTime + 3),
    });
    deps.studentBatchRepo.findByBatchId.mockResolvedValue([
      earlier1,
      earlier2,
      earlier3,
      // simulate our just-inserted record at the end (newest)
      StudentBatch.reconstitute('sb-late', {
        studentId: 'student-late',
        batchId: 'batch-1',
        academyId: 'academy-1',
        assignedAt: new Date(),
      }),
    ]);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-late',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    // Roll back: replaceForStudent called twice — once for insert, once to
    // remove the just-inserted record.
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalledTimes(2);
  });

  it('H3: early racer at index < MAX keeps its slot', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch(3));
    deps.studentRepo.findById.mockResolvedValue(createStudent('student-early'));
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(2);
    // Our record is at the FIRST position (oldest createdAt).
    const baseTime = new Date('2026-01-01').getTime();
    deps.studentBatchRepo.findByBatchId.mockResolvedValue([
      StudentBatch.reconstitute('sb-early', {
        studentId: 'student-early',
        batchId: 'batch-1',
        academyId: 'academy-1',
        assignedAt: new Date(baseTime), // earliest
      }),
      StudentBatch.reconstitute('sb-2', {
        studentId: 's2',
        batchId: 'batch-1',
        academyId: 'academy-1',
        assignedAt: new Date(baseTime + 1000),
      }),
      StudentBatch.reconstitute('sb-3', {
        studentId: 's3',
        batchId: 'batch-1',
        academyId: 'academy-1',
        assignedAt: new Date(baseTime + 2000),
      }),
    ]);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-early',
    });

    expect(result.ok).toBe(true);
    // replaceForStudent called once for the insert; no rollback.
    expect(deps.studentBatchRepo.replaceForStudent).toHaveBeenCalledTimes(1);
  });

  it('idempotent: returns ok if student already in batch (no rollback, no audit)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.studentBatchRepo.findByStudentId.mockResolvedValue([
      StudentBatch.create({
        id: 'sb-existing',
        studentId: 'student-new',
        batchId: 'batch-1',
        academyId: 'academy-1',
      }),
    ]);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      studentId: 'student-new',
    });

    expect(result.ok).toBe(true);
    expect(deps.studentBatchRepo.replaceForStudent).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });
});
