import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventGalleryController } from './event-gallery.controller';
import { AuthModule } from '../auth/auth.module';
import { EventModel, EventSchema } from '@infrastructure/database/schemas/event.schema';
import {
  GalleryPhotoModel,
  GalleryPhotoSchema,
} from '@infrastructure/database/schemas/gallery-photo.schema';
import { MongoEventRepository } from '@infrastructure/repositories/mongo-event.repository';
import { MongoGalleryPhotoRepository } from '@infrastructure/repositories/mongo-gallery-photo.repository';
import { EVENT_REPOSITORY } from '@domain/event/ports/event.repository';
import { GALLERY_PHOTO_REPOSITORY } from '@domain/event/ports/gallery-photo.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { CreateEventUseCase } from '@application/event/use-cases/create-event.usecase';
import { UpdateEventUseCase } from '@application/event/use-cases/update-event.usecase';
import { DeleteEventUseCase } from '@application/event/use-cases/delete-event.usecase';
import { GetEventsUseCase } from '@application/event/use-cases/get-events.usecase';
import { GetEventDetailUseCase } from '@application/event/use-cases/get-event-detail.usecase';
import { GetEventSummaryUseCase } from '@application/event/use-cases/get-event-summary.usecase';
import { ChangeEventStatusUseCase } from '@application/event/use-cases/change-event-status.usecase';
import { ListGalleryPhotosUseCase } from '@application/event/use-cases/list-gallery-photos.usecase';
import { UploadGalleryPhotoUseCase } from '@application/event/use-cases/upload-gallery-photo.usecase';
import { DeleteGalleryPhotoUseCase } from '@application/event/use-cases/delete-gallery-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { TRANSACTION_PORT } from '@application/common/transaction.port';
import type { TransactionPort } from '@application/common/transaction.port';
import { MongoTransactionService } from '@infrastructure/database/mongo-transaction.service';
import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import { MongoParentStudentLinkRepository } from '@infrastructure/repositories/mongo-parent-student-link.repository';
import {
  ParentStudentLinkModel,
  ParentStudentLinkSchema,
} from '@infrastructure/database/schemas/parent-student-link.schema';
import type { PushNotificationService } from '@application/notifications/push-notification.service';
import {
  DeviceTokensModule,
  PUSH_NOTIFICATION_SERVICE,
} from '../device-tokens/device-tokens.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';

@Module({
  imports: [
    AuthModule,
    AuditLogsModule,
    DeviceTokensModule,
    MongooseModule.forFeature([
      { name: EventModel.name, schema: EventSchema },
      { name: GalleryPhotoModel.name, schema: GalleryPhotoSchema },
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
    ]),
  ],
  controllers: [EventsController, EventGalleryController],
  providers: [
    { provide: EVENT_REPOSITORY, useClass: MongoEventRepository },
    { provide: GALLERY_PHOTO_REPOSITORY, useClass: MongoGalleryPhotoRepository },
    { provide: PARENT_STUDENT_LINK_REPOSITORY, useClass: MongoParentStudentLinkRepository },
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
    { provide: TRANSACTION_PORT, useClass: MongoTransactionService },
    {
      provide: 'CREATE_EVENT_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        auditRecorder: AuditRecorderPort,
      ) => new CreateEventUseCase(userRepo, eventRepo, auditRecorder),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY, AUDIT_RECORDER_PORT],
    },
    {
      provide: 'UPDATE_EVENT_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        auditRecorder: AuditRecorderPort,
      ) => new UpdateEventUseCase(userRepo, eventRepo, auditRecorder),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY, AUDIT_RECORDER_PORT],
    },
    {
      provide: 'DELETE_EVENT_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        galleryPhotoRepo: GalleryPhotoRepository,
        fileStorage: FileStoragePort,
        auditRecorder: AuditRecorderPort,
        logger: LoggerPort,
        transaction: TransactionPort,
      ) =>
        new DeleteEventUseCase(
          userRepo,
          eventRepo,
          galleryPhotoRepo,
          fileStorage,
          auditRecorder,
          logger,
          transaction,
        ),
      inject: [
        USER_REPOSITORY,
        EVENT_REPOSITORY,
        GALLERY_PHOTO_REPOSITORY,
        FILE_STORAGE_PORT,
        AUDIT_RECORDER_PORT,
        LOGGER_PORT,
        TRANSACTION_PORT,
      ],
    },
    {
      provide: 'GET_EVENTS_USE_CASE',
      useFactory: (userRepo: UserRepository, eventRepo: EventRepository) =>
        new GetEventsUseCase(userRepo, eventRepo),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY],
    },
    {
      provide: 'GET_EVENT_DETAIL_USE_CASE',
      useFactory: (userRepo: UserRepository, eventRepo: EventRepository) =>
        new GetEventDetailUseCase(userRepo, eventRepo),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY],
    },
    {
      provide: 'GET_EVENT_SUMMARY_USE_CASE',
      useFactory: (userRepo: UserRepository, eventRepo: EventRepository) =>
        new GetEventSummaryUseCase(userRepo, eventRepo),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY],
    },
    {
      provide: 'CHANGE_EVENT_STATUS_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        auditRecorder: AuditRecorderPort,
        parentLinkRepo: ParentStudentLinkRepository,
        push: PushNotificationService,
      ) => new ChangeEventStatusUseCase(userRepo, eventRepo, auditRecorder, parentLinkRepo, push),
      inject: [
        USER_REPOSITORY,
        EVENT_REPOSITORY,
        AUDIT_RECORDER_PORT,
        PARENT_STUDENT_LINK_REPOSITORY,
        PUSH_NOTIFICATION_SERVICE,
      ],
    },
    {
      provide: 'LIST_GALLERY_PHOTOS_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        galleryRepo: GalleryPhotoRepository,
      ) => new ListGalleryPhotosUseCase(userRepo, eventRepo, galleryRepo),
      inject: [USER_REPOSITORY, EVENT_REPOSITORY, GALLERY_PHOTO_REPOSITORY],
    },
    {
      provide: 'UPLOAD_GALLERY_PHOTO_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        galleryRepo: GalleryPhotoRepository,
        fileStorage: FileStoragePort,
        auditRecorder: AuditRecorderPort,
        logger: LoggerPort,
      ) =>
        new UploadGalleryPhotoUseCase(
          userRepo,
          eventRepo,
          galleryRepo,
          fileStorage,
          auditRecorder,
          logger,
        ),
      inject: [
        USER_REPOSITORY,
        EVENT_REPOSITORY,
        GALLERY_PHOTO_REPOSITORY,
        FILE_STORAGE_PORT,
        AUDIT_RECORDER_PORT,
        LOGGER_PORT,
      ],
    },
    {
      provide: 'DELETE_GALLERY_PHOTO_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        eventRepo: EventRepository,
        galleryRepo: GalleryPhotoRepository,
        fileStorage: FileStoragePort,
        auditRecorder: AuditRecorderPort,
        logger: LoggerPort,
      ) =>
        new DeleteGalleryPhotoUseCase(
          userRepo,
          eventRepo,
          galleryRepo,
          fileStorage,
          auditRecorder,
          logger,
        ),
      inject: [
        USER_REPOSITORY,
        EVENT_REPOSITORY,
        GALLERY_PHOTO_REPOSITORY,
        FILE_STORAGE_PORT,
        AUDIT_RECORDER_PORT,
        LOGGER_PORT,
      ],
    },
  ],
})
export class EventsModule {}
