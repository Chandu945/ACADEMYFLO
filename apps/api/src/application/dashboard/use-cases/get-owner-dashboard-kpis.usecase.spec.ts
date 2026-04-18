import { GetOwnerDashboardKpisUseCase } from './get-owner-dashboard-kpis.usecase';
import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryPaymentRequestRepository,
  InMemoryTransactionLogRepository,
  InMemoryFeeDueRepository,
  InMemoryStudentAttendanceRepository,
  InMemoryExpenseRepository,
  InMemoryHolidayRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { TransactionLog } from '@domain/fee/entities/transaction-log.entity';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';

describe('GetOwnerDashboardKpisUseCase', () => {
  let useCase: GetOwnerDashboardKpisUseCase;
  let userRepo: InMemoryUserRepository;
  let studentRepo: InMemoryStudentRepository;
  let prRepo: InMemoryPaymentRequestRepository;
  let tlRepo: InMemoryTransactionLogRepository;
  let fdRepo: InMemoryFeeDueRepository;
  let attRepo: InMemoryStudentAttendanceRepository;
  let expenseRepo: InMemoryExpenseRepository;

  const academyId = 'academy-1';
  const ownerId = 'owner-1';

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    studentRepo = new InMemoryStudentRepository();
    prRepo = new InMemoryPaymentRequestRepository();
    tlRepo = new InMemoryTransactionLogRepository();
    fdRepo = new InMemoryFeeDueRepository();
    attRepo = new InMemoryStudentAttendanceRepository();
    expenseRepo = new InMemoryExpenseRepository();

    useCase = new GetOwnerDashboardKpisUseCase(
      userRepo,
      studentRepo,
      prRepo,
      tlRepo,
      fdRepo,
      attRepo,
      expenseRepo,
      new InMemoryHolidayRepository(),
    );

    // Create owner user
    const owner = User.create({
      id: ownerId,
      fullName: 'Owner',
      email: 'owner@test.com',
      phoneNumber: '+919900000001',
      passwordHash: 'hash',
      role: 'OWNER',
    });
    const ownerWithAcademy = User.reconstitute(ownerId, {
      ...owner['props'],
      academyId,
    });
    await userRepo.save(ownerWithAcademy);
  });

  it('should return all KPIs for the owner', async () => {
    // Use current time-based monthKey so it matches what the dashboard derives from `from`
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

    // Create 2 active students with unpaid dues for this month
    for (let i = 0; i < 2; i++) {
      const sid = `student-${i}`;
      const student = Student.create({
        id: sid,
        academyId,
        fullName: `Student ${i}`,
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
        address: { line1: 'Addr', city: 'City', state: 'State', pincode: '123456' },
        guardian: { name: 'Guard', mobile: '+919900000002', email: 'g@test.com' },
        joiningDate: new Date('2024-01-01'),
        monthlyFee: 500,
      });
      await studentRepo.save(student);

      const due = FeeDue.create({
        id: `due-${i}`,
        academyId,
        studentId: sid,
        monthKey,
        dueDate: `${monthKey}-05`,
        amount: 500,
      });
      await fdRepo.save(due);
    }

    // Create a transaction log (createdAt = now, within the date range)
    const tx = TransactionLog.create({
      id: 'tx-1',
      academyId,
      feeDueId: 'due-other',
      paymentRequestId: null,
      studentId: 'student-other',
      monthKey,
      amount: 500,
      source: 'OWNER_DIRECT',
      collectedByUserId: ownerId,
      approvedByUserId: ownerId,
      receiptNumber: 'PC-000001',
    });
    await tlRepo.save(tx);

    // Create a pending payment request
    const pr = PaymentRequest.create({
      id: 'pr-1',
      academyId,
      studentId: 'student-0',
      feeDueId: 'due-0',
      monthKey,
      amount: 500,
      staffUserId: 'staff-1',
      staffNotes: 'Cash collected',
    });
    await prRepo.save(pr);

    // Date range: start of this month to end of this month
    const from = new Date(y, m, 1, 0, 0, 0, 0);
    const to = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const result = await useCase.execute({
      actorUserId: ownerId,
      actorRole: 'OWNER',
      from,
      to,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalStudents).toBe(2);
      expect(result.value.newAdmissions).toBe(0);
      expect(result.value.inactiveStudents).toBe(0);
      expect(result.value.pendingPaymentRequests).toBe(1);
      expect(result.value.totalCollected).toBe(500);
      expect(result.value.totalPendingAmount).toBe(1000);
    }
  });

  it('should reject non-owner access', async () => {
    const staffId = 'staff-2';
    const staff = User.create({
      id: staffId,
      fullName: 'Staff',
      email: 'staff@test.com',
      phoneNumber: '+919900000003',
      passwordHash: 'hash',
      role: 'STAFF',
    });
    const staffWithAcademy = User.reconstitute(staffId, {
      ...staff['props'],
      academyId,
    });
    await userRepo.save(staffWithAcademy);

    const result = await useCase.execute({
      actorUserId: staffId,
      actorRole: 'STAFF',
      from: new Date(),
      to: new Date(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});
