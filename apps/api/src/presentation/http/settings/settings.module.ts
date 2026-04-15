import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { InstituteInfoController } from './institute-info.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';
import { GetAcademySettingsUseCase } from '@application/academy/use-cases/get-academy-settings.usecase';
import { UpdateAcademySettingsUseCase } from '@application/academy/use-cases/update-academy-settings.usecase';
import { GetInstituteInfoUseCase } from '@application/academy/use-cases/get-institute-info.usecase';
import { UpdateInstituteInfoUseCase } from '@application/academy/use-cases/update-institute-info.usecase';
import { UploadInstituteImageUseCase } from '@application/academy/use-cases/upload-institute-image.usecase';
import { DeleteInstituteImageUseCase } from '@application/academy/use-cases/delete-institute-image.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';

@Module({
  imports: [AuthModule, AcademyOnboardingModule],
  controllers: [SettingsController, InstituteInfoController],
  providers: [
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
    {
      provide: 'GET_ACADEMY_SETTINGS_USE_CASE',
      useFactory: (userRepo: UserRepository, academyRepo: AcademyRepository) =>
        new GetAcademySettingsUseCase(userRepo, academyRepo),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'UPDATE_ACADEMY_SETTINGS_USE_CASE',
      useFactory: (userRepo: UserRepository, academyRepo: AcademyRepository) =>
        new UpdateAcademySettingsUseCase(userRepo, academyRepo),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'GET_INSTITUTE_INFO_USE_CASE',
      useFactory: (userRepo: UserRepository, academyRepo: AcademyRepository) =>
        new GetInstituteInfoUseCase(userRepo, academyRepo),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'UPDATE_INSTITUTE_INFO_USE_CASE',
      useFactory: (userRepo: UserRepository, academyRepo: AcademyRepository) =>
        new UpdateInstituteInfoUseCase(userRepo, academyRepo),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'UPLOAD_INSTITUTE_IMAGE_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
        fileStorage: FileStoragePort,
      ) => new UploadInstituteImageUseCase(userRepo, academyRepo, fileStorage),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY, FILE_STORAGE_PORT],
    },
    {
      provide: 'DELETE_INSTITUTE_IMAGE_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
        fileStorage: FileStoragePort,
      ) => new DeleteInstituteImageUseCase(userRepo, academyRepo, fileStorage),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY, FILE_STORAGE_PORT],
    },
  ],
})
export class SettingsModule {}
