import { DeleteBatchUseCase } from './delete-batch.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { TransactionPort } from '../../common/transaction.port';
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

function createBatch(academyId = 'academy-1'): Batch {
  return Batch.create({
    id: 'batch-1',
    academyId,
    batchName: 'Annual Day Batch',
    days: ['MON', 'WED', 'FRI'],
    startTime: '06:00',
    endTime: '07:30',
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
    deleteById: jest.fn().mockResolvedValue(undefined),
  };
  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    findByStudentId: jest.fn(),
    findByStudentIds: jest.fn().mockResolvedValue([]),
    findByBatchId: jest.fn(),
    deleteByBatchId: jest.fn().mockResolvedValue(0),
    countByBatchId: jest.fn().mockResolvedValue(0),
    countByBatchIds: jest.fn().mockResolvedValue(new Map()),
  };
  const transaction: TransactionPort = {
    run: async <T>(fn: () => Promise<T>) => fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, batchRepo, studentBatchRepo, transaction, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new DeleteBatchUseCase(
    deps.userRepo,
    deps.batchRepo,
    deps.studentBatchRepo,
    deps.transaction,
    deps.audit,
  );
}

describe('DeleteBatchUseCase', () => {
  // H4 regression: BATCH_DELETED audit fires with full context.
  it('H4: records BATCH_DELETED audit with batch name + schedule + studentsUnassigned count', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(7);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BATCH_DELETED',
        entityType: 'BATCH',
        entityId: 'batch-1',
        context: expect.objectContaining({
          batchName: 'Annual Day Batch',
          days: 'MON,WED,FRI',
          startTime: '06:00',
          endTime: '07:30',
          studentsUnassigned: '7',
        }),
      }),
    );
  });

  // M6 regression: response carries the count of students unassigned so
  // the UI can show "Deleted batch X — N students unassigned".
  it('M6: response includes studentsUnassigned count', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    deps.studentBatchRepo.countByBatchId.mockResolvedValue(12);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ deleted: true, studentsUnassigned: 12 });
    }
  });

  it('cascades student-batch deletion + batch deletion inside one transaction', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());
    const runSpy: TransactionPort['run'] = jest.fn(<T>(fn: () => Promise<T>) =>
      fn(),
    ) as unknown as TransactionPort['run'];
    deps.transaction = { run: runSpy };

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
    });

    expect(result.ok).toBe(true);
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(deps.studentBatchRepo.deleteByBatchId).toHaveBeenCalledWith('batch-1');
    expect(deps.batchRepo.deleteById).toHaveBeenCalledWith('batch-1');
  });

  it('rejects non-OWNER (STAFF cannot delete)', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      batchId: 'batch-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects when batch is in a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    deps.batchRepo.findById.mockResolvedValue(createBatch('other-academy'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.batchRepo.deleteById).not.toHaveBeenCalled();
  });
});
