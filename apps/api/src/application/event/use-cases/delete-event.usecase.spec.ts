import { DeleteEventUseCase } from './delete-event.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { TransactionPort } from '../../common/transaction.port';
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
    title: 'Parents Meet',
    startDate: new Date('2026-05-10'),
    isAllDay: true,
    status: 'UPCOMING',
    createdBy: 'owner-1',
  });
}

function createPhoto(id: string, eventId = 'event-1', academyId = 'academy-1'): GalleryPhoto {
  return GalleryPhoto.create({
    id,
    eventId,
    academyId,
    url: `https://r2/${id}`,
    uploadedBy: 'owner-1',
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
  const eventRepo: jest.Mocked<EventRepository> = {
    save: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    countByAcademyAndMonth: jest.fn(),
  };
  const galleryPhotoRepo: jest.Mocked<GalleryPhotoRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    listByEventId: jest.fn().mockResolvedValue([]),
    delete: jest.fn(),
    deleteAllByEventId: jest.fn(),
    countByEventId: jest.fn(),
  };
  const fileStorage: jest.Mocked<FileStoragePort> = {
    upload: jest.fn(),
    delete: jest.fn(),
  };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  // Pass-through transaction: invokes fn directly so repo calls run in order.
  const transaction: TransactionPort = {
    run: async <T>(fn: () => Promise<T>) => fn(),
  };
  return { userRepo, eventRepo, galleryPhotoRepo, fileStorage, logger, audit, transaction };
}

describe('DeleteEventUseCase', () => {
  function makeUc(deps: ReturnType<typeof buildDeps>) {
    return new DeleteEventUseCase(
      deps.userRepo,
      deps.eventRepo,
      deps.galleryPhotoRepo,
      deps.fileStorage,
      deps.audit,
      deps.logger,
      deps.transaction,
    );
  }

  it('deletes an event with no gallery photos', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.fileStorage.delete).not.toHaveBeenCalled();
    expect(deps.galleryPhotoRepo.deleteAllByEventId).not.toHaveBeenCalled();
    // Regression guard for X2-H1: delete() must be called with academyId so
    // the Mongo query is scoped by both fields. The signature is typed so TS
    // catches regressions, but the runtime call should also reflect it.
    expect(deps.eventRepo.delete).toHaveBeenCalledWith('event-1', 'academy-1');
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EVENT_DELETED', entityType: 'EVENT' }),
    );
  });

  // Regression guard for X6-C1: the photo-row delete and event-row delete must
  // be issued inside TransactionPort.run so a failure in one rolls back the
  // other. Prior code deleted them in separate awaits — a crash after photo
  // delete but before event delete left orphaned state.
  it('deletes gallery photos and event inside a single transaction', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.listByEventId.mockResolvedValue([
      createPhoto('photo-1'),
      createPhoto('photo-2'),
    ]);
    const txnRun: TransactionPort['run'] = jest.fn(<T>(fn: () => Promise<T>) => fn()) as unknown as TransactionPort['run'];
    deps.transaction = { run: txnRun };

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    expect(txnRun).toHaveBeenCalledTimes(1);
    // Both DB writes should have happened as part of the single run() call
    expect(deps.galleryPhotoRepo.deleteAllByEventId).toHaveBeenCalledWith('event-1', 'academy-1');
    expect(deps.eventRepo.delete).toHaveBeenCalledWith('event-1', 'academy-1');
    // R2 deletes run per photo, OUTSIDE the transaction (best-effort)
    expect(deps.fileStorage.delete).toHaveBeenCalledTimes(2);
  });

  it('treats R2 delete failures as best-effort and still deletes DB rows', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(createEvent());
    deps.galleryPhotoRepo.listByEventId.mockResolvedValue([createPhoto('photo-1')]);
    deps.fileStorage.delete.mockRejectedValue(new Error('transient R2 outage'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.logger.warn).toHaveBeenCalled();
    expect(deps.galleryPhotoRepo.deleteAllByEventId).toHaveBeenCalled();
    expect(deps.eventRepo.delete).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ galleryStorageFailures: '1' }),
      }),
    );
  });

  it('rejects when event belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    deps.eventRepo.findById.mockResolvedValue(createEvent('academy-other'));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.galleryPhotoRepo.deleteAllByEventId).not.toHaveBeenCalled();
    expect(deps.eventRepo.delete).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'STAFF',
      eventId: 'event-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects non-existent event', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.eventRepo.findById.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      eventId: 'event-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.eventRepo.delete).not.toHaveBeenCalled();
  });
});
