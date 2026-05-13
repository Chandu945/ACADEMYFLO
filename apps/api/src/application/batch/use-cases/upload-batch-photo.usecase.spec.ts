import { UploadBatchPhotoUseCase } from './upload-batch-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
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

function createBatch(photoUrl: string | null = null): Batch {
  const b = Batch.create({
    id: 'batch-1',
    academyId: 'academy-1',
    batchName: 'Morning Batch',
  });
  return Batch.reconstitute('batch-1', { ...b['props'], profilePhotoUrl: photoUrl });
}

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636400000000050001a3a3a30000000049454e44ae426082',
  'hex',
);

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
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
  const fileStorage: jest.Mocked<FileStoragePort> = {
    upload: jest.fn().mockResolvedValue({ url: 'https://r2/new-batch-photo.png' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const audit: jest.Mocked<AuditRecorderPort> = { record: jest.fn().mockResolvedValue(undefined) };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { userRepo, batchRepo, fileStorage, audit, logger };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UploadBatchPhotoUseCase(
    deps.userRepo,
    deps.batchRepo,
    deps.fileStorage,
    deps.audit,
    deps.logger,
  );
}

describe('UploadBatchPhotoUseCase', () => {
  // H1 regression: upload before delete (mirrors student/staff photo fixes).
  it('H1: uploads new photo BEFORE deleting old photo', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch('https://r2/old-photo.png'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    const uploadOrder = deps.fileStorage.upload.mock.invocationCallOrder[0];
    const deleteOrder = deps.fileStorage.delete.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(deleteOrder!);
  });

  // H2 regression: typed error on R2 failure, batch keeps old photo.
  it('H2: R2 upload failure returns UPLOAD_FAILED and leaves old photo intact', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch('https://r2/old.png'));
    deps.fileStorage.upload.mockRejectedValue(new Error('R2 outage'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_FAILED');
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
    expect(deps.batchRepo.save).not.toHaveBeenCalled();
  });

  it('H1+H2: old-photo delete failure is best-effort (logs, returns ok)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch('https://r2/old.png'));
    deps.fileStorage.delete.mockRejectedValue(new Error('R2 hiccup'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    expect(deps.batchRepo.save).toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  // M1 regression: BATCH_PHOTO_UPLOADED audit with context.
  it('M1: records BATCH_PHOTO_UPLOADED audit with batch name + filename', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.batchRepo.findById.mockResolvedValue(createBatch());

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      batchId: 'batch-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'morning-batch.png',
    });

    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BATCH_PHOTO_UPLOADED',
        entityType: 'BATCH',
        context: {
          batchName: 'Morning Batch',
          mimeType: 'image/png',
          originalName: 'morning-batch.png',
        },
      }),
    );
  });

  it('rejects non-OWNER/STAFF', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      batchId: 'batch-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'p.png',
    });
    expect(result.ok).toBe(false);
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
  });
});
