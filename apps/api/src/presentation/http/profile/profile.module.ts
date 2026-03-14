import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { AuthModule } from '../auth/auth.module';

import {
  ParentStudentLinkModel,
  ParentStudentLinkSchema,
} from '@infrastructure/database/schemas/parent-student-link.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';

import { MongoParentStudentLinkRepository } from '@infrastructure/repositories/mongo-parent-student-link.repository';
import { MongoStudentRepository } from '@infrastructure/repositories/mongo-student.repository';
import { CloudinaryStorageService } from '@infrastructure/storage/cloudinary-storage.service';

import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import { STUDENT_REPOSITORY } from '@domain/student/ports/student.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';

import { UploadProfilePhotoUseCase } from '@application/identity/use-cases/upload-profile-photo.usecase';

import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
      { name: StudentModel.name, schema: StudentSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [
    { provide: PARENT_STUDENT_LINK_REPOSITORY, useClass: MongoParentStudentLinkRepository },
    { provide: STUDENT_REPOSITORY, useClass: MongoStudentRepository },
    { provide: FILE_STORAGE_PORT, useClass: CloudinaryStorageService },
    {
      provide: 'UPLOAD_PROFILE_PHOTO_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        fileStorage: FileStoragePort,
        parentLinkRepo: ParentStudentLinkRepository,
        studentRepo: StudentRepository,
      ) => new UploadProfilePhotoUseCase(userRepo, fileStorage, parentLinkRepo, studentRepo),
      inject: [USER_REPOSITORY, FILE_STORAGE_PORT, PARENT_STUDENT_LINK_REPOSITORY, STUDENT_REPOSITORY],
    },
  ],
})
export class ProfileModule {}
