import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
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
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';

@Module({
  imports: [AuthModule],
  controllers: [StaffController],
  providers: [
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
    {
      provide: 'CREATE_STAFF_USE_CASE',
      useFactory: (userRepo: UserRepository, hasher: PasswordHasher) =>
        new CreateStaffUseCase(userRepo, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
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
      useFactory: (userRepo: UserRepository, sessionRepo: SessionRepository) =>
        new SetStaffStatusUseCase(userRepo, sessionRepo),
      inject: [USER_REPOSITORY, SESSION_REPOSITORY],
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
