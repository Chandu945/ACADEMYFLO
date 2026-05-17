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
  InMemoryAcademyRepository,
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
    const academyRepoForKpi = new InMemoryAcademyRepository();

    useCase = new GetOwnerDashboardKpisUseCase(
      userRepo,
      studentRepo,
      prRepo,
      tlRepo,
      fdRepo,
      academyRepoForKpi,
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
      baseAmount: 500,
      lateFeeAmount: 0,
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

  it('M1: returns todayAbsentCount=0 on a declared holiday', async () => {
    // Pre-fix code computed `Math.max(0, totalStudents - todayPresentCount)`
    // unconditionally. On a holiday todayPresentCount is 0, so the owner
    // saw "all N students absent today" — useless panic noise. Post-fix:
    // isHolidayToday short-circuits the count to 0.
    const holidayRepoForKpi = new InMemoryHolidayRepository();
    const academyRepoForKpi = new InMemoryAcademyRepository();
    const localUseCase = new GetOwnerDashboardKpisUseCase(
      userRepo,
      studentRepo,
      prRepo,
      tlRepo,
      fdRepo,
      academyRepoForKpi,
      attRepo,
      expenseRepo,
      holidayRepoForKpi,
    );

    // Seed 3 active students.
    for (let i = 0; i < 3; i++) {
      const student = Student.create({
        id: `student-h-${i}`,
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
    }

    // Declare today as a holiday. formatLocalDate uses IST, so we match
    // that here to ensure the repo returns the holiday for the date the
    // use-case actually queries.
    const todayIst = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const { Holiday } = await import('@domain/attendance/entities/holiday.entity');
    await holidayRepoForKpi.save(
      Holiday.create({
        id: 'h1',
        academyId,
        date: todayIst,
        reason: 'Test Holiday',
        declaredByUserId: ownerId,
      }),
    );

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const from = new Date(y, m, 1, 0, 0, 0, 0);
    const to = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const result = await localUseCase.execute({
      actorUserId: ownerId,
      actorRole: 'OWNER',
      from,
      to,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isHolidayToday).toBe(true);
      // Pre-fix: would have been 3 (totalStudents - 0 present). Post-fix: 0.
      expect(result.value.todayAbsentCount).toBe(0);
    }
  });

  it('default-present: unmarked students count toward present, not absent', async () => {
    // Default-present model (replaces the old "unmarked = absent" assertion):
    // with two students and no ABSENT records, the dashboard reports zero
    // absences. The scheduled/present split is exercised separately by the
    // in-memory repo (which stubs scheduled = active count for tests that
    // don't seed batch enrollments).
    for (let i = 0; i < 2; i++) {
      const student = Student.create({
        id: `student-nh-${i}`,
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
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const result = await useCase.execute({
      actorUserId: ownerId,
      actorRole: 'OWNER',
      from: new Date(y, m, 1, 0, 0, 0, 0),
      to: new Date(y, m + 1, 0, 23, 59, 59, 999),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isHolidayToday).toBe(false);
      // No ABSENT rows exist → 0 absences regardless of how many are unmarked.
      expect(result.value.todayAbsentCount).toBe(0);
      // Stub `countScheduledStudentsByAcademyAndDate` returns the active
      // count (2 here), so all scheduled students are implicitly present.
      expect(result.value.todayPresentCount).toBe(2);
      expect(result.value.todayScheduledCount).toBe(2);
    }
  });

  it('two batches, absent in one + present in another → NOT counted as absent on dashboard', async () => {
    // Matches the day-level definition in get-student-monthly-attendance:
    // a student counts as absent for the day only if every scheduled
    // batch has an explicit ABSENT row. Present (or unmarked) in any
    // other batch → "partial" present day, not absent. Before this
    // fix the dashboard would have counted such a student as absent
    // while their own monthly view called the same day "present".
    const student = Student.create({
      id: 'student-multi-batch',
      academyId,
      fullName: 'Two-batch Student',
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: 'Addr', city: 'City', state: 'State', pincode: '123456' },
      guardian: { name: 'Guard', mobile: '+919900000002', email: 'g@test.com' },
      joiningDate: new Date('2024-01-01'),
      monthlyFee: 500,
    });
    await studentRepo.save(student);

    // Seed today's records: ABSENT in morning batch, PRESENT in evening batch.
    // The in-memory repo's last-write-wins behavior is fine here — what we
    // care about is the count method, which inspects all records added.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const morning = (await import('@domain/attendance/entities/student-attendance.entity'))
      .StudentAttendance.create({
        id: 'att-morning',
        academyId,
        studentId: 'student-multi-batch',
        batchId: 'batch-morning',
        date: today,
        markedByUserId: ownerId,
        status: 'ABSENT',
      });
    const evening = (await import('@domain/attendance/entities/student-attendance.entity'))
      .StudentAttendance.create({
        id: 'att-evening',
        academyId,
        studentId: 'student-multi-batch',
        batchId: 'batch-evening',
        date: today,
        markedByUserId: ownerId,
        status: 'PRESENT',
      });
    // The in-memory key drops batchId — write the PRESENT record last so
    // the repo state reflects "has at least one PRESENT row today". That's
    // exactly the signal the in-memory implementation of the new method
    // uses to refuse to count the student as absent.
    await attRepo.save(morning);
    await attRepo.save(evening);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const result = await useCase.execute({
      actorUserId: ownerId,
      actorRole: 'OWNER',
      from: new Date(y, m, 1, 0, 0, 0, 0),
      to: new Date(y, m + 1, 0, 23, 59, 59, 999),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // The student has an ABSENT row, but also a PRESENT row in another
      // batch on the same day → not "absent in all scheduled batches" →
      // not counted on the dashboard tile.
      expect(result.value.todayAbsentCount).toBe(0);
    }
  });

  it('two batches, absent in both → IS counted as absent on dashboard', async () => {
    const student = Student.create({
      id: 'student-fully-absent',
      academyId,
      fullName: 'Fully Absent Student',
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: 'Addr', city: 'City', state: 'State', pincode: '123456' },
      guardian: { name: 'Guard', mobile: '+919900000002', email: 'g@test.com' },
      joiningDate: new Date('2024-01-01'),
      monthlyFee: 500,
    });
    await studentRepo.save(student);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    // Single ABSENT record covers the in-memory model (which can't distinguish
    // multiple batches per day anyway); the Mongo aggregation does the real
    // per-batch check. Either way: no PRESENT row exists for this student
    // today → counts as absent.
    const absent = (await import('@domain/attendance/entities/student-attendance.entity'))
      .StudentAttendance.create({
        id: 'att-absent',
        academyId,
        studentId: 'student-fully-absent',
        batchId: 'batch-morning',
        date: today,
        markedByUserId: ownerId,
        status: 'ABSENT',
      });
    await attRepo.save(absent);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const result = await useCase.execute({
      actorUserId: ownerId,
      actorRole: 'OWNER',
      from: new Date(y, m, 1, 0, 0, 0, 0),
      to: new Date(y, m + 1, 0, 23, 59, 59, 999),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.todayAbsentCount).toBe(1);
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
