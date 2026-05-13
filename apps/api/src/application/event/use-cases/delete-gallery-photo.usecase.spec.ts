import { DeleteGalleryPhotoUseCase } from './delete-gallery-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { User } from '@domain/identity/entities/user.entity';
import { CalendarEvent } from '@domain/event/entities/event.entity';
import { GalleryPhoto } from '@domain/event/entities/gallery-photo.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const base = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  if (academyId) return User.reconstitute('owner-1', { ...base['props'], academyId });
  return base;
}

function createEvent(academyId = 'academy-1'): CalendarEvent {
  return CalendarEvent.create({
    id: 'event-1',
    academyId,
    title: 'Annual Day',
    startDate: new Date('2026-05-10'),
    isAllDay: true,
    status: 'UPCOMING',
    createdBy: 'owner-1',
  });
}

function createPhoto(uploadedBy = 'owner-1'): GalleryPhoto {
  return GalleryPhoto.create({
    id: 'photo-1',
    eventId: 'event-1',
    academyId: 'academy-1',
    url: 'https://r2/photo-1',
    uploadedBy,
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
  const eventRepo: jest.Mocked<EventRepository> = {
    save: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    countByAcademyAndMonth: jest.fn(),
  };
  const galleryPhotoRepo: jest.Mocked<GalleryPhotoRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    listByEventId: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteAllByEventId: jest.fn(),
    countByEventId: jest.fn(),
  };
  const fileStorage: jest.Mocked<FileStoragePort> = {
    upload: jest.fn(),
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
  return { userRepo, eventRepo, galleryPhotoRepo, fileStorage, audit, logger };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new DeleteGalleryPhotoUseCase(
    deps.userRepo,
    deps.eventRepo,
    deps.galleryPhotoRepo,
    deps.fileStorage,
    deps.audit,
    deps.logger,
  );
}

describe('DeleteGalleryPhotoUseCase', () => {
  it('deletes the record then the blob, then audits', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.findById.mockResolvedValue(createPhoto());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      photoId: 'photo-1',
    });

    expect(result.ok).toBe(true);
    // H3 regression: record delete must happen BEFORE blob delete.
    const recordOrder = deps.galleryPhotoRepo.delete.mock.invocationCallOrder[0];
    const blobOrder = deps.fileStorage.delete.mock.invocationCallOrder[0];
    expect(recordOrder).toBeLessThan(blobOrder!);
    // M6: audit context has eventId + uploadedBy
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GALLERY_PHOTO_DELETED',
        context: { eventId: 'event-1', uploadedBy: 'owner-1' },
      }),
    );
  });

  // H2 regression: an R2 outage must NOT block the user-visible delete.
  // The record is already gone; orphan blob will be picked up by storage GC.
  it('H2: succeeds even when R2 delete throws (best-effort, logged)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.findById.mockResolvedValue(createPhoto());
    deps.fileStorage.delete.mockRejectedValue(new Error('transient R2 outage'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      photoId: 'photo-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.galleryPhotoRepo.delete).toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalled();
  });

  it('STAFF can only delete photos they uploaded', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue({
      ...createOwner(),
      role: 'STAFF',
    } as User);
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.findById.mockResolvedValue(createPhoto('owner-1')); // different uploader

    const result = await makeUc(deps).execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      eventId: 'event-1',
      photoId: 'photo-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.galleryPhotoRepo.delete).not.toHaveBeenCalled();
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
  });

  it('rejects when the photo belongs to a different event', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    const otherPhoto = GalleryPhoto.create({
      id: 'photo-1',
      eventId: 'other-event',
      academyId: 'academy-1',
      url: 'https://r2/photo-1',
      uploadedBy: 'owner-1',
    });
    deps.galleryPhotoRepo.findById.mockResolvedValue(otherPhoto);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      photoId: 'photo-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.galleryPhotoRepo.delete).not.toHaveBeenCalled();
  });

  it('rejects when event is in a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    deps.eventRepo.findById.mockResolvedValue(createEvent('other-academy'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      photoId: 'photo-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.galleryPhotoRepo.delete).not.toHaveBeenCalled();
  });
});
