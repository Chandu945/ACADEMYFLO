import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminRevenueController } from './admin-revenue.controller';
import { AuthModule } from '../auth/auth.module';
import {
  SubscriptionModel,
  SubscriptionSchema,
} from '@infrastructure/database/schemas/subscription.schema';
import {
  AcademyModel,
  AcademySchema,
} from '@infrastructure/database/schemas/academy.schema';
import { MongoAdminRevenueReader } from '@infrastructure/admin/admin-revenue-reader';
import { ADMIN_REVENUE_READER } from '@application/admin/ports/admin-revenue-reader.port';
import type { AdminRevenueReader } from '@application/admin/ports/admin-revenue-reader.port';
import { GetAdminRevenueUseCase } from '@application/admin/use-cases/get-admin-revenue.usecase';

/**
 * MRR / ARR / tier distribution / conversion KPIs for super-admin dashboard.
 * Read-only, queries existing collections.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
      { name: AcademyModel.name, schema: AcademySchema },
    ]),
    AuthModule,
  ],
  controllers: [AdminRevenueController],
  providers: [
    { provide: ADMIN_REVENUE_READER, useClass: MongoAdminRevenueReader },
    {
      provide: 'GET_ADMIN_REVENUE_USE_CASE',
      useFactory: (reader: AdminRevenueReader) => new GetAdminRevenueUseCase(reader),
      inject: [ADMIN_REVENUE_READER],
    },
  ],
})
export class AdminRevenueModule {}
