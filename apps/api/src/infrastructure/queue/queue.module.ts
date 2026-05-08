import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueService } from './queue.service';
import { EmailQueueProcessor } from './processors/email-queue.processor';
import { NotificationQueueProcessor } from './processors/notification-queue.processor';
import {
  AbsenceNotificationProcessor,
  SEND_ABSENCE_NOTIFICATION_USE_CASE,
} from './processors/absence-notification.processor';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';
import { BullMqAbsenceNotificationScheduler } from '@infrastructure/notifications/bullmq-absence-notification-scheduler';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import { ABSENCE_NOTIFICATION_SCHEDULER_PORT } from '@application/notifications/ports/absence-notification-scheduler.port';
import { SendAbsenceNotificationUseCase } from '@application/notifications/use-cases/send-absence-notification.usecase';
import {
  DeviceTokensModule,
  PUSH_NOTIFICATION_SERVICE,
} from '../../presentation/http/device-tokens/device-tokens.module';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import {
  StudentAttendanceModel,
  StudentAttendanceSchema,
} from '@infrastructure/database/schemas/student-attendance.schema';
import { HolidayModel, HolidaySchema } from '@infrastructure/database/schemas/holiday.schema';
import {
  ParentStudentLinkModel,
  ParentStudentLinkSchema,
} from '@infrastructure/database/schemas/parent-student-link.schema';
import { MongoStudentRepository } from '@infrastructure/repositories/mongo-student.repository';
import { MongoStudentAttendanceRepository } from '@infrastructure/repositories/mongo-student-attendance.repository';
import { MongoHolidayRepository } from '@infrastructure/repositories/mongo-holiday.repository';
import { MongoParentStudentLinkRepository } from '@infrastructure/repositories/mongo-parent-student-link.repository';
import { STUDENT_REPOSITORY } from '@domain/student/ports/student.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { STUDENT_ATTENDANCE_REPOSITORY } from '@domain/attendance/ports/student-attendance.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import { HOLIDAY_REPOSITORY } from '@domain/attendance/ports/holiday.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PushNotificationService } from '@application/notifications/push-notification.service';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';

@Global()
@Module({
  imports: [
    // DeviceTokensModule exports PUSH_NOTIFICATION_SERVICE needed by both
    // NotificationQueueProcessor and SendAbsenceNotificationUseCase below.
    DeviceTokensModule,
    // Schemas the absence-notification use-case reads at firing time. The
    // queue module is global; registering them here is the cleanest
    // co-location with the worker that uses them.
    MongooseModule.forFeature([
      { name: StudentModel.name, schema: StudentSchema },
      { name: StudentAttendanceModel.name, schema: StudentAttendanceSchema },
      { name: HolidayModel.name, schema: HolidaySchema },
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
    ]),
  ],
  providers: [
    QueueService,
    // EMAIL_SENDER_PORT for the email worker to call when processing jobs
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    EmailQueueProcessor,
    NotificationQueueProcessor,

    // ─── Absence notifications ───────────────────────────────────────────
    { provide: STUDENT_REPOSITORY, useClass: MongoStudentRepository },
    { provide: STUDENT_ATTENDANCE_REPOSITORY, useClass: MongoStudentAttendanceRepository },
    { provide: HOLIDAY_REPOSITORY, useClass: MongoHolidayRepository },
    { provide: PARENT_STUDENT_LINK_REPOSITORY, useClass: MongoParentStudentLinkRepository },
    {
      provide: ABSENCE_NOTIFICATION_SCHEDULER_PORT,
      useClass: BullMqAbsenceNotificationScheduler,
    },
    {
      provide: SEND_ABSENCE_NOTIFICATION_USE_CASE,
      useFactory: (
        sr: StudentRepository,
        ar: StudentAttendanceRepository,
        hr: HolidayRepository,
        plr: ParentStudentLinkRepository,
        push: PushNotificationService,
        logger: LoggerPort,
      ) => new SendAbsenceNotificationUseCase(sr, ar, hr, plr, push, logger),
      inject: [
        STUDENT_REPOSITORY,
        STUDENT_ATTENDANCE_REPOSITORY,
        HOLIDAY_REPOSITORY,
        PARENT_STUDENT_LINK_REPOSITORY,
        PUSH_NOTIFICATION_SERVICE,
        LOGGER_PORT,
      ],
    },
    AbsenceNotificationProcessor,
  ],
  exports: [QueueService, ABSENCE_NOTIFICATION_SCHEDULER_PORT],
})
export class QueueModule {}
