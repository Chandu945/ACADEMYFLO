import { UpdateBatchUseCase } from './update-batch.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { Batch } from '@domain/batch/entities/batch.entity';

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

function createBatch(opts: Partial<{ maxStudents: number | null }> = {}): Batch {
  return Batch.create({
    id: 'batch-1',
    academyId: 'academy-1',
    batchName: 'Morning Batch',
    days: ['MON', 'WED'],
    startTime: '06:00',
    endTime: '07:30',
    maxStudents: opts.maxStudents ?? null,
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
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByAcademyAndName: jest.fn().mockResolvedValue(null),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    findByStudentId: jest.fn(),
    findByStudentIds: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn(),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn().mockResolvedValue(0),
    countByBatchIds: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, batchRepo, studentBatchRepo, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UpdateBatchUseCase(deps.userRepo, deps.batchRepo, deps.studentBatchRepo, deps.audit);
}

describe('UpdateBatchUseCase', () => {
  // M1+M2 regression: records changedFields in audit.
  it('M1+M2: records changedFields in BATCH_UPDATED audit context', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      startTime: '07:00',
      endTime: '08:30',
    });

    expect(result.ok).toBe(true);
    const call = deps.audit.record.mock.calls[0]![0];
    expect(call.action).toBe('BATCH_UPDATED');
    const changedFields = call.context?.['changedFields'] ?? '';
    expect(changedFields).toMatch(/startTime/);
    expect(changedFields).toMatch(/endTime/);
    expect(changedFields).not.toMatch(/batchName/);
    expect(changedFields).not.toMatch(/days/);
  });

  // M2 regression: no-op skip when nothing actually changed.
  it('M2: no-op skip when input matches current state', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      batchName: 'Morning Batch',
      startTime: '06:00',
      endTime: '07:30',
    });

    expect(result.ok).toBe(true);
    expect(deps.batchRepo.save).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // M3 regression: E11000 from concurrent rename → typed CONFLICT, not 500.
  it('M3: catches E11000 from concurrent name collision', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    // pre-flight findByAcademyAndName finds nothing (race window), then save throws.
    deps.batchRepo.save.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000, keyPattern: { batchNameNormalized: 1 } }),
    );

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      batchName: 'Evening Batch',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  // M8 regression: capacity reduction below current count is rejected.
  it('M8: rejects reducing maxStudents below current enrolled count', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch({ maxStudents: 30 }));
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(25);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      maxStudents: 20, // less than the 25 currently enrolled
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(deps.batchRepo.save).not.toHaveBeenCalled();
  });

  it('M8: allows increasing maxStudents above current enrolled count', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch({ maxStudents: 30 }));
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(25);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      maxStudents: 40,
    });

    expect(result.ok).toBe(true);
  });

  it('M8: allows reducing maxStudents to a value >= current count', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch({ maxStudents: 30 }));
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(25);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      maxStudents: 25, // exactly current
    });

    expect(result.ok).toBe(true);
  });

  it('rejects when batch is in a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    const other = Batch.create({
      id: 'batch-1',
      academyId: 'other-academy',
      batchName: 'Other Batch',
    });
    deps.batchRepo.findById.mockResolvedValue(other);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      batchName: 'New Name',
    });

    expect(result.ok).toBe(false);
    expect(deps.batchRepo.save).not.toHaveBeenCalled();
  });
});
