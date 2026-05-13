import { UploadStaffPhotoUseCase } from './upload-staff-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { User } from '@domain/identity/entities/user.entity';

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

function createStaff(opts: Partial<{ photoUrl: string | null; academyId: string }> = {}): User {
  const u = User.create({
    id: 'staff-1',
    fullName: 'Priya Staff',
    email: 'priya@test.com',
    phoneNumber: '+919876543211',
    role: 'STAFF',
    passwordHash: 'h',
  });
  return User.reconstitute('staff-1', {
    ...u['props'],
    academyId: opts.academyId ?? 'academy-1',
    profilePhotoUrl: opts.photoUrl ?? null,
  });
}

// Minimal PNG (1x1 transparent).
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636400000000050001a3a3a30000000049454e44ae426082',
  'hex',
);

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
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
  const fileStorage: jest.Mocked<FileStoragePort> = {
    upload: jest.fn().mockResolvedValue({ url: 'https://r2/new-photo.png' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { userRepo, fileStorage, audit, logger };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UploadStaffPhotoUseCase(deps.userRepo, deps.fileStorage, deps.audit, deps.logger);
}

describe('UploadStaffPhotoUseCase', () => {
  // H1 regression: upload must happen BEFORE old-photo delete. Prior code
  // deleted the old photo first, so a failed upload left the staff with no
  // photo at all permanently.
  it('H1: uploads new photo BEFORE deleting old photo', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff({ photoUrl: 'https://r2/old-photo.png' }));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    const uploadOrder = deps.fileStorage.upload.mock.invocationCallOrder[0];
    const deleteOrder = deps.fileStorage.delete.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(deleteOrder!);
  });

  // H2 regression: an R2 upload failure must surface as a typed error, not
  // a raw 500. Staff still has their old photo because we never touched the
  // DB record.
  it('H2: returns UPLOAD_FAILED when R2 upload throws, leaves old photo intact', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff({ photoUrl: 'https://r2/old-photo.png' }));
    deps.fileStorage.upload.mockRejectedValue(new Error('R2 outage'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_FAILED');
    // Old photo NOT deleted, DB record NOT touched.
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
    expect(deps.userRepo.save).not.toHaveBeenCalled();
  });

  // H1 partial-failure semantic: old-photo delete failing is best-effort.
  // The new photo IS already uploaded + saved; the orphan blob is acceptable.
  it('H1+H2: old-photo delete failure is best-effort (logs, returns ok)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff({ photoUrl: 'https://r2/old-photo.png' }));
    deps.fileStorage.delete.mockRejectedValue(new Error('R2 hiccup'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    // New photo saved.
    expect(deps.userRepo.save).toHaveBeenCalled();
    // Warning logged for the orphan blob.
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  // M5 regression: audit context must include staff name, mimeType, and
  // original filename (URL omitted - PII path for the staff member).
  it('M5: audit context includes staffName, mimeType, originalName (no URL)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff());

    await makeUc(deps).execute({
      actorUserId: 'owner-1',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'priya-profile.png',
    });

    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_PHOTO_UPLOADED',
        context: {
          staffName: 'Priya Staff',
          mimeType: 'image/png',
          originalName: 'priya-profile.png',
        },
      }),
    );
  });

  it('rejects non-OWNER', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValueOnce(createStaff({ academyId: 'academy-1' }));

    const result = await makeUc(deps).execute({
      actorUserId: 'staff-2',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'p.png',
    });

    expect(result.ok).toBe(false);
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
  });

  it('rejects when staff belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner('academy-1'))
      .mockResolvedValueOnce(createStaff({ academyId: 'other-academy' }));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      staffUserId: 'staff-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'p.png',
    });

    expect(result.ok).toBe(false);
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
  });
});
