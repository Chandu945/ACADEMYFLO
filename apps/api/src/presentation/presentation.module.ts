import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantThrottlerGuard } from './http/common/guards/tenant-throttler.guard';
import { JwtAuthGuard } from './http/common/guards/jwt-auth.guard';
import { HealthModule } from './http/health/health.module';
import { AuthModule } from './http/auth/auth.module';
import { AcademyOnboardingModule } from './http/academy-onboarding/academy-onboarding.module';
import { SubscriptionModule } from './http/subscription/subscription.module';
import { SubscriptionPaymentsModule } from './http/subscription-payments/subscription-payments.module';
import { StaffModule } from './http/staff/staff.module';
import { BatchesModule } from './http/batches/batches.module';
import { StudentsModule } from './http/students/students.module';
import { AttendanceModule } from './http/attendance/attendance.module';
import { SettingsModule } from './http/settings/settings.module';
import { FeesModule } from './http/fees/fees.module';
import { PaymentRequestsModule } from './http/fees/payment-requests.module';
import { DashboardModule } from './http/dashboard/dashboard.module';
import { ReportsModule } from './http/reports/reports.module';
import { StaffAttendanceModule } from './http/staff-attendance/staff-attendance.module';
import { ExpensesModule } from './http/expenses/expenses.module';
import { EnquiryModule } from './http/enquiry/enquiry.module';
import { EventsModule } from './http/events/events.module';
import { AuditLogsModule } from './http/audit-logs/audit-logs.module';
import { AdminAuthModule } from './http/admin-auth/admin-auth.module';
import { AdminModule } from './http/admin/admin.module';
import { MetricsModule } from './http/metrics/metrics.module';
import { ParentModule } from './http/parent/parent.module';
import { ReviewsModule } from './http/reviews/reviews.module';
import { UploadsModule } from './http/uploads/uploads.module';
import { ProfileModule } from './http/profile/profile.module';
import { AccountDeletionModule } from './http/account-deletion/account-deletion.module';
import { DeviceTokensModule } from './http/device-tokens/device-tokens.module';
import { SeedingModule } from '@infrastructure/seeding/seeding.module';
import { SubscriptionEnforcementGuard } from './http/common/guards/subscription-enforcement.guard';
import { HttpLoggingInterceptor } from './http/common/interceptors/http-logging.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 200 },     // burst: 200 req / 10s (handles page loads with multiple API calls)
      { name: 'medium', ttl: 60_000, limit: 1000 },   // sustained: 1000 req / 60s (~16.7 req/sec)
      { name: 'long', ttl: 900_000, limit: 10_000 },  // long-window: 10k req / 15min (~11 req/sec)
    ]),
    HealthModule,
    AuthModule,
    AcademyOnboardingModule,
    SubscriptionModule,
    SubscriptionPaymentsModule,
    StaffModule,
    BatchesModule,
    StudentsModule,
    AttendanceModule,
    SettingsModule,
    FeesModule,
    PaymentRequestsModule,
    ExpensesModule,
    EnquiryModule,
    EventsModule,
    DashboardModule,
    ReportsModule,
    StaffAttendanceModule,
    AuditLogsModule,
    AdminAuthModule,
    AdminModule,
    MetricsModule,
    ParentModule,
    ReviewsModule,
    UploadsModule,
    ProfileModule,
    AccountDeletionModule,
    DeviceTokensModule,
    // Seeding runs OnModuleInit and mutates the super-admin user.
    // Restricted to development so prod/staging provisioning is an
    // explicit ops action rather than an implicit boot-time side effect.
    ...(process.env['APP_ENV'] === 'development' ? [SeedingModule] : []),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionEnforcementGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class PresentationModule {}
