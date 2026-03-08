import { SendFeeRemindersUseCase } from './send-fee-reminders.usecase';
import {
  InMemoryFeeDueRepository,
  InMemoryStudentRepository,
  InMemoryAcademyRepository,
  InMemorySubscriptionRepository,
} from '../../../../test/helpers/in-memory-repos';
import type { EmailSenderPort } from '../ports/email-sender.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { ClockPort } from '../../common/clock.port';
import { Academy } from '@domain/academy/entities/academy.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { Subscription } from '@domain/subscription/entities/subscription.entity';

function createAcademy(id = 'academy-1', loginDisabled = false): Academy {
  const academy = Academy.create({
    id,
    ownerUserId: 'owner-1',
    academyName: 'Test Academy',
    address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
  });
  if (loginDisabled) {
    return Academy.reconstitute(id, { ...academy['props'], loginDisabled: true });
  }
  return academy;
}

function createSubscription(
  academyId: string,
  opts: { trialDaysLeft?: number; blocked?: boolean } = {},
): Subscription {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + (opts.trialDaysLeft ?? 20));
  const trialStart = new Date(now);
  trialStart.setDate(trialStart.getDate() - 10);
  return Subscription.createTrial({
    id: `sub-${academyId}`,
    academyId,
    trialStartAt: opts.blocked ? new Date('2020-01-01') : trialStart,
    trialEndAt: opts.blocked ? new Date('2020-02-01') : trialEnd,
  });
}

function createStudent(
  id: string,
  academyId: string,
  email: string | null = null,
  guardianEmail = 'guardian@test.com',
): Student {
  return Student.create({
    id,
    academyId,
    fullName: `Student ${id}`,
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '123 St', city: 'City', state: 'ST', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543210', email: guardianEmail },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
    mobileNumber: null,
    email,
  });
}

function createFeeDue(
  id: string,
  academyId: string,
  studentId: string,
  dueDate: string,
  monthKey = '2024-03',
): FeeDue {
  return FeeDue.create({ id, academyId, studentId, monthKey, dueDate, amount: 500 });
}

function mockLogger(): LoggerPort {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('SendFeeRemindersUseCase', () => {
  let feeDueRepo: InMemoryFeeDueRepository;
  let studentRepo: InMemoryStudentRepository;
  let academyRepo: InMemoryAcademyRepository;
  let subscriptionRepo: InMemorySubscriptionRepository;
  let emailSender: jest.Mocked<EmailSenderPort>;
  let logger: LoggerPort;
  let clock: ClockPort;
  let useCase: SendFeeRemindersUseCase;

  const fixedDate = new Date('2024-03-02T10:00:00.000Z');

  beforeEach(() => {
    feeDueRepo = new InMemoryFeeDueRepository();
    studentRepo = new InMemoryStudentRepository();
    academyRepo = new InMemoryAcademyRepository();
    subscriptionRepo = new InMemorySubscriptionRepository();
    emailSender = { send: jest.fn().mockResolvedValue(true) };
    logger = mockLogger();
    clock = { now: () => fixedDate };

    useCase = new SendFeeRemindersUseCase(
      feeDueRepo,
      studentRepo,
      academyRepo,
      subscriptionRepo,
      emailSender,
      logger,
      clock,
    );
  });

  it('should return all zeros when no dues found', async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDuesFound).toBe(0);
      expect(result.value.emailsSent).toBe(0);
    }
  });

  it('should send to student email when present', async () => {
    const academy = createAcademy();
    await academyRepo.save(academy);
    await subscriptionRepo.save(createSubscription('academy-1'));
    const student = createStudent('s1', 'academy-1', 'student@test.com');
    await studentRepo.save(student);
    // dueDate = fixedDate + 3 days = 2024-03-05
    const due = createFeeDue('d1', 'academy-1', 's1', '2024-03-05');
    await feeDueRepo.save(due);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.emailsSent).toBe(1);
    }
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'student@test.com' }),
    );
  });

  it('should fall back to guardian email when student email is null', async () => {
    const academy = createAcademy();
    await academyRepo.save(academy);
    await subscriptionRepo.save(createSubscription('academy-1'));
    const student = createStudent('s1', 'academy-1', null, 'guardian@test.com');
    await studentRepo.save(student);
    const due = createFeeDue('d1', 'academy-1', 's1', '2024-03-05');
    await feeDueRepo.save(due);

    await useCase.execute();
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'guardian@test.com' }),
    );
  });

  it('should skip BLOCKED academy', async () => {
    const academy = createAcademy();
    await academyRepo.save(academy);
    await subscriptionRepo.save(createSubscription('academy-1', { blocked: true }));
    const student = createStudent('s1', 'academy-1', 'a@test.com');
    await studentRepo.save(student);
    const due = createFeeDue('d1', 'academy-1', 's1', '2024-03-05');
    await feeDueRepo.save(due);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.academiesSkipped).toBe(1);
      expect(result.value.emailsSent).toBe(0);
    }
  });

  it('should skip DISABLED academy', async () => {
    const academy = createAcademy('academy-1', true);
    await academyRepo.save(academy);
    await subscriptionRepo.save(createSubscription('academy-1'));
    const student = createStudent('s1', 'academy-1', 'a@test.com');
    await studentRepo.save(student);
    const due = createFeeDue('d1', 'academy-1', 's1', '2024-03-05');
    await feeDueRepo.save(due);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.academiesSkipped).toBe(1);
      expect(result.value.emailsSent).toBe(0);
    }
  });

  it('should handle multi-academy run with mixed statuses', async () => {
    // Academy 1: active
    await academyRepo.save(createAcademy('a1'));
    await subscriptionRepo.save(createSubscription('a1'));
    await studentRepo.save(createStudent('s1', 'a1', 'x@test.com'));
    await feeDueRepo.save(createFeeDue('d1', 'a1', 's1', '2024-03-05'));

    // Academy 2: blocked
    await academyRepo.save(createAcademy('a2'));
    await subscriptionRepo.save(createSubscription('a2', { blocked: true }));
    await studentRepo.save(createStudent('s2', 'a2', 'y@test.com'));
    await feeDueRepo.save(createFeeDue('d2', 'a2', 's2', '2024-03-05'));

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDuesFound).toBe(2);
      expect(result.value.academiesProcessed).toBe(1);
      expect(result.value.academiesSkipped).toBe(1);
      expect(result.value.emailsSent).toBe(1);
    }
  });

  it('should count failures correctly', async () => {
    await academyRepo.save(createAcademy());
    await subscriptionRepo.save(createSubscription('academy-1'));
    await studentRepo.save(createStudent('s1', 'academy-1', 'a@test.com'));
    await feeDueRepo.save(createFeeDue('d1', 'academy-1', 's1', '2024-03-05'));
    emailSender.send.mockResolvedValue(false);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.emailsFailed).toBe(1);
      expect(result.value.emailsSent).toBe(0);
    }
  });

  it('should silently skip when academy not found', async () => {
    // Create a due for a non-existent academy
    const due = createFeeDue('d1', 'missing-academy', 's1', '2024-03-05');
    await feeDueRepo.save(due);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.academiesSkipped).toBe(1);
      expect(result.value.emailsSent).toBe(0);
    }
  });

  it('should silently skip when student not found', async () => {
    await academyRepo.save(createAcademy());
    await subscriptionRepo.save(createSubscription('academy-1'));
    // Due references non-existent student
    const due = createFeeDue('d1', 'academy-1', 'missing-student', '2024-03-05');
    await feeDueRepo.save(due);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.studentsSkippedNoEmail).toBe(1);
      expect(result.value.emailsSent).toBe(0);
    }
  });
});
