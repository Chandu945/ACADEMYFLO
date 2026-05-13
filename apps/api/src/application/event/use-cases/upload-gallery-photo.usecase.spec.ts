import { UploadGalleryPhotoUseCase, MAX_PHOTOS_PER_EVENT } from './upload-gallery-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
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
    title: 'Sports Day',
    startDate: new Date('2026-06-01'),
    isAllDay: true,
    status: 'UPCOMING',
    createdBy: 'owner-1',
  });
}

// Minimal PNG (1x1 transparent) — passes the magic-byte detection in the use case.
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
  const eventRepo: jest.Mocked<EventRepository> = {
    save: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    countByAcademyAndMonth: jest.fn(),
  };
  const galleryPhotoRepo: jest.Mocked<GalleryPhotoRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    listByEventId: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteAllByEventId: jest.fn(),
    countByEventId: jest.fn().mockResolvedValue(0),
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
  return { userRepo, eventRepo, galleryPhotoRepo, fileStorage, audit, logger };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UploadGalleryPhotoUseCase(
    deps.userRepo,
    deps.eventRepo,
    deps.galleryPhotoRepo,
    deps.fileStorage,
    deps.audit,
    deps.logger,
  );
}

describe('UploadGalleryPhotoUseCase', () => {
  it('uploads, saves, and audits on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    // After save, the only photo on the event is our new one — index 0, in cap.
    deps.galleryPhotoRepo.save.mockImplementation(async (photo) => {
      deps.galleryPhotoRepo.listByEventId.mockResolvedValue([photo]);
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    expect(deps.galleryPhotoRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.galleryPhotoRepo.delete).not.toHaveBeenCalled();
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
    // M6: audit context has eventId + originalName
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GALLERY_PHOTO_UPLOADED',
        context: { eventId: 'event-1', originalName: 'photo.png' },
      }),
    );
  });

  it('pre-flight rejects when already at the cap', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.countByEventId.mockResolvedValue(MAX_PHOTOS_PER_EVENT);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    // The R2 upload and DB save should NOT have happened.
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
    expect(deps.galleryPhotoRepo.save).not.toHaveBeenCalled();
  });

  // H1 regression guard. Two racers at count = MAX-1 both pass pre-flight and
  // both save (count becomes MAX+1). Sorted ASC by createdAt + id, only the
  // later racer (index MAX) rolls back. One success, one error.
  it('H1: when racer is at index >= MAX after save, rolls back its own photo and errors', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.countByEventId.mockResolvedValue(MAX_PHOTOS_PER_EVENT - 1);

    // Pretend MAX-1 existing photos already exist with old createdAt, and
    // simulate another racer's photo lands BEFORE ours. After our save, the
    // list has MAX+1 photos. Sorted ASC, our photo (newest createdAt) is at
    // index MAX → rolls back.
    deps.galleryPhotoRepo.save.mockImplementation(async (photo) => {
      const existing: GalleryPhoto[] = [];
      const baseTime = new Date('2026-01-01').getTime();
      for (let i = 0; i < MAX_PHOTOS_PER_EVENT - 1; i++) {
        const p = GalleryPhoto.create({
          id: `existing-${i}`,
          eventId: 'event-1',
          academyId: 'academy-1',
          url: `https://r2/existing-${i}`,
          uploadedBy: 'owner-1',
        });
        // Force an older createdAt so sort ordering is deterministic.
        const older = GalleryPhoto.reconstitute(p.id.toString(), {
          ...p['props'],
          audit: { ...p.audit, createdAt: new Date(baseTime + i) },
        });
        existing.push(older);
      }
      // Simulate the OTHER racer that landed milliseconds before ours.
      const otherRacer = GalleryPhoto.create({
        id: 'other-racer',
        eventId: 'event-1',
        academyId: 'academy-1',
        url: 'https://r2/other-racer',
        uploadedBy: 'staff-1',
      });
      const otherEarlier = GalleryPhoto.reconstitute(otherRacer.id.toString(), {
        ...otherRacer['props'],
        audit: { ...otherRacer.audit, createdAt: new Date(baseTime + MAX_PHOTOS_PER_EVENT) },
      });
      // Our photo: latest createdAt (use Date.now() / now()).
      deps.galleryPhotoRepo.listByEventId.mockResolvedValue([...existing, otherEarlier, photo]);
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    // Our photo rolled back (both DB row and R2 blob).
    expect(deps.galleryPhotoRepo.delete).toHaveBeenCalled();
    expect(deps.fileStorage.delete).toHaveBeenCalled();
  });

  // The mirror case: we're the EARLIER racer (our createdAt is older than
  // the other racer's), so we end up at index MAX-1 (in cap). Keep.
  it('H1: when racer is at index < MAX after save, keeps the photo', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.countByEventId.mockResolvedValue(MAX_PHOTOS_PER_EVENT - 1);

    deps.galleryPhotoRepo.save.mockImplementation(async (photo) => {
      const existing: GalleryPhoto[] = [];
      const baseTime = new Date('2026-01-01').getTime();
      for (let i = 0; i < MAX_PHOTOS_PER_EVENT - 1; i++) {
        const p = GalleryPhoto.create({
          id: `existing-${i}`,
          eventId: 'event-1',
          academyId: 'academy-1',
          url: `https://r2/existing-${i}`,
          uploadedBy: 'owner-1',
        });
        const older = GalleryPhoto.reconstitute(p.id.toString(), {
          ...p['props'],
          audit: { ...p.audit, createdAt: new Date(baseTime + i) },
        });
        existing.push(older);
      }
      // The OTHER racer is LATER than us — they end up at index MAX, not us.
      const otherRacer = GalleryPhoto.create({
        id: 'other-racer',
        eventId: 'event-1',
        academyId: 'academy-1',
        url: 'https://r2/other-racer',
        uploadedBy: 'staff-1',
      });
      const otherLater = GalleryPhoto.reconstitute(otherRacer.id.toString(), {
        ...otherRacer['props'],
        // Future date — definitely after our `photo.audit.createdAt` (which is now()).
        audit: { ...otherRacer.audit, createdAt: new Date(Date.now() + 60_000) },
      });
      deps.galleryPhotoRepo.listByEventId.mockResolvedValue([...existing, photo, otherLater]);
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    // Our photo stays — no rollback.
    expect(deps.galleryPhotoRepo.delete).not.toHaveBeenCalled();
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER/STAFF roles', async () => {
    const deps = buildDeps();

    const result = await makeUc(deps).execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
  });

  it('rejects when event belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent('other-academy'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
      buffer: PNG,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    expect(deps.fileStorage.upload).not.toHaveBeenCalled();
  });
});
