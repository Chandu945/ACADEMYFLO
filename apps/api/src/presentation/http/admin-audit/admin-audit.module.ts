import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminAuditController } from './admin-audit.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import {
  AuditLogModel,
  AuditLogSchema,
} from '@infrastructure/database/schemas/audit-log.schema';
import { MongoAdminAuditLogReader } from '@infrastructure/admin/admin-audit-log-reader';
import { ADMIN_AUDIT_LOG_READER } from '@application/admin/ports/admin-audit-log-reader.port';
import type { AdminAuditLogReader } from '@application/admin/ports/admin-audit-log-reader.port';
import { ListAllAuditLogsUseCase } from '@application/admin/use-cases/list-all-audit-logs.usecase';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';

/**
 * Cross-academy audit log feed for super-admins. Lives in its own module so
 * the per-academy AuditLogsModule and AdminModule stay unchanged.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLogModel.name, schema: AuditLogSchema }]),
    AuthModule, // exports USER_REPOSITORY
    AcademyOnboardingModule, // exports ACADEMY_REPOSITORY
  ],
  controllers: [AdminAuditController],
  providers: [
    { provide: ADMIN_AUDIT_LOG_READER, useClass: MongoAdminAuditLogReader },
    {
      provide: 'LIST_ALL_AUDIT_LOGS_USE_CASE',
      useFactory: (
        reader: AdminAuditLogReader,
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
      ) => new ListAllAuditLogsUseCase(reader, userRepo, academyRepo),
      inject: [ADMIN_AUDIT_LOG_READER, USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
  ],
})
export class AdminAuditModule {}
