import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { FeeRemindersCronService } from '../src/infrastructure/scheduling/fee-reminders-cron.service';
import { SendFeeRemindersUseCase } from '../src/application/notifications/use-cases/send-fee-reminders.usecase';
import {
  InMemoryFeeDueRepository,
  InMemoryStudentRepository,
  InMemoryAcademyRepository,
  InMemorySubscriptionRepository,
} from './helpers/in-memory-repos';
import type { EmailSenderPort } from '../src/application/notifications/ports/email-sender.port';
import { EMAIL_SENDER_PORT } from '../src/application/notifications/ports/email-sender.port';
import { LOGGER_PORT } from '../src/shared/logging/logger.port';
import { JOB_LOCK_PORT } from '../src/application/common/ports/job-lock.port';
import { PUSH_NOTIFICATION_SERVICE } from '../src/presentation/http/device-tokens/device-tokens.module';
import { QueueService } from '../src/infrastructure/queue/queue.service';
import { AppConfigService } from '../src/shared/config/config.service';
import { Academy } from '../src/domain/academy/entities/academy.entity';
import { Student } from '../src/domain/student/entities/student.entity';
import { FeeDue } from '../src/domain/fee/entities/fee-due.entity';
import { Subscription } from '../src/domain/subscription/entities/subscription.entity';

describe('FeeRemindersCronService (integration)', () => {
  let cronService: FeeRemindersCronService;
  let feeDueRepo: InMemoryFeeDueRepository;
  let studentRepo: InMemoryStudentRepository;
  let academyRepo: InMemoryAcademyRepository;
  let subscriptionRepo: InMemorySubscriptionRepository;
  let mockEmailSender: jest.Mocked<EmailSenderPort>;

  const fixedDate = new Date('2024-03-02T03:30:00.000Z'); // IST: 2024-03-02 09:00

  beforeEach(async () => {
    feeDueRepo = new InMemoryFeeDueRepository();
    studentRepo = new InMemoryStudentRepository();
    academyRepo = new InMemoryAcademyRepository();
    subscriptionRepo = new InMemorySubscriptionRepository();
    mockEmailSender = { send: jest.fn().mockResolvedValue(true) };

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const mockConfig = {
      feeReminderEnabled: true,
      emailDryRun: true,
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      smtpFrom: 'noreply@academyflo.com',
    } as unknown as AppConfigService;

    const useCase = new SendFeeRemindersUseCase(
      feeDueRepo,
      studentRepo,
      academyRepo,
      subscriptionRepo,
      mockEmailSender,
      logger,
      { now: () => fixedDate },
    );

    const mockJobLock = {
      withLock: jest.fn(async (_name: string, _ttl: number, fn: () => Promise<void>) => {
        await fn();
        return { ran: true };
      }),
    };

    const mockOverduePush = { execute: jest.fn().mockResolvedValue({ ok: true, value: {} }) };
    const mockPushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
    const mockQueueService = {
      registerEmailFallback: jest.fn(),
      registerNotificationFallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeRemindersCronService,
        { provide: 'SEND_FEE_REMINDERS_USE_CASE', useValue: useCase },
        { provide: 'SEND_OVERDUE_PUSH_REMINDERS_USE_CASE', useValue: mockOverduePush },
        { provide: AppConfigService, useValue: mockConfig },
        { provide: JOB_LOCK_PORT, useValue: mockJobLock },
        { provide: LOGGER_PORT, useValue: logger },
        { provide: EMAIL_SENDER_PORT, useValue: mockEmailSender },
        { provide: PUSH_NOTIFICATION_SERVICE, useValue: mockPushService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    cronService = module.get(FeeRemindersCronService);
  });

  it('should send email when student has due 3 days from now', async () => {
    // Seed academy
    const academy = Academy.create({
      id: 'academy-1',
      ownerUserId: 'owner-1',
      academyName: 'Test Academy',
      address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
    });
    await academyRepo.save(academy);

    // Seed subscription (trial active)
    const trialStart = new Date('2024-02-15');
    const trialEnd = new Date('2024-03-16');
    const subscription = Subscription.createTrial({
      id: 'sub-1',
      academyId: 'academy-1',
      trialStartAt: trialStart,
      trialEndAt: trialEnd,
    });
    await subscriptionRepo.save(subscription);

    // Seed student with guardian email
    const student = Student.create({
      id: 's1',
      academyId: 'academy-1',
      fullName: 'Arun Sharma',
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: '123 St', city: 'City', state: 'ST', pincode: '400001' },
      guardian: { name: 'Raj Sharma', mobile: '+919876543210', email: 'raj@test.com' },
      joiningDate: new Date('2024-01-01'),
      monthlyFee: 500,
    });
    await studentRepo.save(student);

    // Seed fee due with dueDate = 2024-03-05 (3 days from fixedDate)
    const due = FeeDue.create({
      id: 'd1',
      academyId: 'academy-1',
      studentId: 's1',
      monthKey: '2024-03',
      dueDate: '2024-03-05',
      amount: 500,
    });
    await feeDueRepo.save(due);

    // Act
    await cronService.handleFeeReminders();

    // Assert
    expect(mockEmailSender.send).toHaveBeenCalledTimes(1);
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'raj@test.com',
        subject: expect.stringContaining('Arun Sharma'),
      }),
    );
  });

  it('should not send when cron is disabled', async () => {
    // Override config with disabled
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeRemindersCronService,
        {
          provide: 'SEND_FEE_REMINDERS_USE_CASE',
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'SEND_OVERDUE_PUSH_REMINDERS_USE_CASE',
          useValue: { execute: jest.fn() },
        },
        {
          provide: AppConfigService,
          useValue: { feeReminderEnabled: false } as unknown as AppConfigService,
        },
        {
          provide: JOB_LOCK_PORT,
          useValue: {
            withLock: jest.fn(async (_name: string, _ttl: number, fn: () => Promise<void>) => {
              await fn();
              return { ran: true };
            }),
          },
        },
        {
          provide: LOGGER_PORT,
          useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
        { provide: EMAIL_SENDER_PORT, useValue: { send: jest.fn() } },
        { provide: PUSH_NOTIFICATION_SERVICE, useValue: { sendToUsers: jest.fn() } },
        {
          provide: QueueService,
          useValue: { registerEmailFallback: jest.fn(), registerNotificationFallback: jest.fn() },
        },
      ],
    }).compile();

    const disabledCron = module.get(FeeRemindersCronService);
    await disabledCron.handleFeeReminders();

    expect(mockEmailSender.send).not.toHaveBeenCalled();
  });
});
