import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import { CreateStaffUseCase } from '@application/staff/use-cases/create-staff.usecase';
import { ListStaffUseCase } from '@application/staff/use-cases/list-staff.usecase';
import { UpdateStaffUseCase } from '@application/staff/use-cases/update-staff.usecase';
import { SetStaffStatusUseCase } from '@application/staff/use-cases/set-staff-status.usecase';
import { UploadStaffPhotoUseCase } from '@application/staff/use-cases/upload-staff-photo.usecase';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { DEVICE_TOKEN_REPOSITORY } from '@domain/notification/ports/device-token.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';

@Module({
  imports: [AuthModule, AcademyOnboardingModule],
  controllers: [StaffController],
  providers: [
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    {
      provide: 'CREATE_STAFF_USE_CASE',
      useFactory: (userRepo: UserRepository, hasher: PasswordHasher, academyRepo: AcademyRepository, emailSender: EmailSenderPort) =>
        new CreateStaffUseCase(userRepo, hasher, academyRepo, emailSender),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ACADEMY_REPOSITORY, EMAIL_SENDER_PORT],
    },
    {
      provide: 'LIST_STAFF_USE_CASE',
      useFactory: (userRepo: UserRepository) => new ListStaffUseCase(userRepo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: 'UPDATE_STAFF_USE_CASE',
      useFactory: (userRepo: UserRepository, hasher: PasswordHasher) =>
        new UpdateStaffUseCase(userRepo, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: 'SET_STAFF_STATUS_USE_CASE',
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository, emailSender: EmailSenderPort, academyRepo: AcademyRepository, deviceTokenRepo: DeviceTokenRepository) =>
        new SetStaffStatusUseCase(userRepo, sessionRepo, emailSender, academyRepo, deviceTokenRepo),
      inject: [USER_REPOSITORY, SESSION_REPOSITORY, EMAIL_SENDER_PORT, ACADEMY_REPOSITORY, DEVICE_TOKEN_REPOSITORY],
    },
    {
      provide: 'UPLOAD_STAFF_PHOTO_USE_CASE',
      useFactory: (userRepo: UserRepository, fileStorage: FileStoragePort) =>
        new UploadStaffPhotoUseCase(userRepo, fileStorage),
      inject: [USER_REPOSITORY, FILE_STORAGE_PORT],
    },
  ],
})
export class StaffModule {}
