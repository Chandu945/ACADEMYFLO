import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUsersController } from './admin-users.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { UserModel, UserSchema } from '@infrastructure/database/schemas/user.schema';
import { MongoAdminUserReader } from '@infrastructure/admin/admin-user-reader';
import { ADMIN_USER_READER } from '@application/admin/ports/admin-user-reader.port';
import type { AdminUserReader } from '@application/admin/ports/admin-user-reader.port';
import { SearchAdminUsersUseCase } from '@application/admin/use-cases/search-admin-users.usecase';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';

/**
 * Cross-academy user search for super-admins. Read-only.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
    AuthModule,
    AcademyOnboardingModule,
  ],
  controllers: [AdminUsersController],
  providers: [
    { provide: ADMIN_USER_READER, useClass: MongoAdminUserReader },
    {
      provide: 'SEARCH_ADMIN_USERS_USE_CASE',
      useFactory: (reader: AdminUserReader, academyRepo: AcademyRepository) =>
        new SearchAdminUsersUseCase(reader, academyRepo),
      inject: [ADMIN_USER_READER, ACADEMY_REPOSITORY],
    },
  ],
})
export class AdminUsersModule {}
