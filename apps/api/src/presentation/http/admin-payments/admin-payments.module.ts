import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminPaymentsController } from './admin-payments.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import {
  SubscriptionPaymentModel,
  SubscriptionPaymentSchema,
} from '@infrastructure/database/schemas/subscription-payment.schema';
import { MongoAdminSubscriptionPaymentReader } from '@infrastructure/admin/admin-subscription-payment-reader';
import { ADMIN_SUBSCRIPTION_PAYMENT_READER } from '@application/admin/ports/admin-subscription-payment-reader.port';
import type { AdminSubscriptionPaymentReader } from '@application/admin/ports/admin-subscription-payment-reader.port';
import { ListAllSubscriptionPaymentsUseCase } from '@application/admin/use-cases/list-all-subscription-payments.usecase';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';

/**
 * Cross-academy subscription payments listing for super-admins. Read-only;
 * never modifies the payment lifecycle (which lives in the existing
 * SubscriptionPaymentsModule).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPaymentModel.name, schema: SubscriptionPaymentSchema },
    ]),
    AuthModule,
    AcademyOnboardingModule,
  ],
  controllers: [AdminPaymentsController],
  providers: [
    {
      provide: ADMIN_SUBSCRIPTION_PAYMENT_READER,
      useClass: MongoAdminSubscriptionPaymentReader,
    },
    {
      provide: 'LIST_ALL_SUBSCRIPTION_PAYMENTS_USE_CASE',
      useFactory: (
        reader: AdminSubscriptionPaymentReader,
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
      ) => new ListAllSubscriptionPaymentsUseCase(reader, userRepo, academyRepo),
      inject: [ADMIN_SUBSCRIPTION_PAYMENT_READER, USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
  ],
})
export class AdminPaymentsModule {}
