import { RejectPaymentRequestUseCase } from './reject-payment-request.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ClockPort } from '../../common/clock.port';
import type { TransactionPort } from '../../common/transaction.port';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { User } from '@domain/identity/entities/user.entity';

describe('RejectPaymentRequestUseCase', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let studentRepo: jest.Mocked<StudentRepository>;
  let prRepo: jest.Mocked<PaymentRequestRepository>;
  let feeDueRepo: jest.Mocked<FeeDueRepository>;
  let clock: ClockPort;
  let tx: TransactionPort;

  const fixedNow = new Date('2024-03-10T10:00:00.000Z');

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      save: jest.fn(),
      updateAcademyId: jest.fn(),
      listByAcademyAndRole: jest.fn(),
      countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
      incrementTokenVersionByAcademyId: jest.fn(),
      incrementTokenVersionByUserId: jest.fn(),
      listByAcademyId: jest.fn(),
      anonymizeAndSoftDelete: jest.fn(),
    } as jest.Mocked<UserRepository>;

    studentRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      listActiveByAcademy: jest.fn(),
      countActiveByAcademy: jest.fn(),
      findByIds: jest.fn(),
      findBirthdaysByAcademy: jest.fn(),
      findByEmailInAcademy: jest.fn(),
      findByPhoneInAcademy: jest.fn(),
      countInactiveByAcademy: jest.fn(),
      countNewAdmissionsByAcademyAndDateRange: jest.fn(),
      saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
    } as jest.Mocked<StudentRepository>;

    prRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findPendingByFeeDue: jest.fn(),
      listByAcademyAndStatuses: jest.fn(),
      listByStaffAndAcademy: jest.fn(),
      countPendingByAcademy: jest.fn(),
      deleteAllByAcademyAndStudent: jest.fn(),
    } as jest.Mocked<PaymentRequestRepository>;

    feeDueRepo = {
      save: jest.fn(),
      bulkSave: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      findById: jest.fn(),
      findByAcademyStudentMonth: jest.fn(),
      listByAcademyMonthAndStatuses: jest.fn(),
      listByAcademyMonthPaid: jest.fn(),
      listByStudentAndRange: jest.fn(),
      listUpcomingByAcademyAndMonth: jest.fn(),
      listByAcademyAndMonth: jest.fn(),
      listUnpaidByAcademy: jest.fn(),
      sumUnpaidAmountByAcademy: jest.fn(),
      countDistinctUnpaidStudentsByAcademyAndMonth: jest.fn(),
      findUnpaidByDueDate: jest.fn(),
      findOverdueDues: jest.fn(),
      findDueWithoutSnapshot: jest.fn(),
      deleteUpcomingByStudent: jest.fn(),
      sumLateFeeCollectedByAcademyAndMonth: jest.fn(),
      sumLateFeeCollectedByAcademyAndDateRange: jest.fn(),
      sumUnpaidAmountByAcademyAndMonth: jest.fn(),
      countOverdueByAcademy: jest.fn(),
      listOverdueByAcademy: jest.fn(),
    } as jest.Mocked<FeeDueRepository>;

    clock = { now: () => fixedNow };
    tx = { run: jest.fn().mockImplementation((fn) => fn()) };
  });

  function makeOwner() {
    const u = User.create({
      id: 'owner-1',
      fullName: 'Owner',
      email: 'owner@e.com',
      phoneNumber: '+919876543210',
      role: 'OWNER',
      passwordHash: 'h',
    });
    return User.reconstitute('owner-1', { ...u['props'], academyId: 'academy-1' });
  }

  function makeFeeDueDue() {
    const due = FeeDue.create({
      id: 'due-1',
      academyId: 'academy-1',
      studentId: 's1',
      monthKey: '2024-03',
      dueDate: '2024-03-05',
      amount: 500,
    });
    // The reject path checks status !== 'PAID' before re-saving as DUE.
    // Any non-PAID status exercises that branch; DUE is the simplest.
    return FeeDue.reconstitute('due-1', { ...due['props'], status: 'DUE' });
  }

  function makeStaffSourceRequest() {
    return PaymentRequest.create({
      id: 'pr-1',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'due-1',
      monthKey: '2024-03',
      amount: 500,
      staffUserId: 'staff-1',
      staffNotes: 'Collected from parent',
    });
  }

  function makeParentSourceRequest() {
    return PaymentRequest.create({
      id: 'pr-1',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'due-1',
      monthKey: '2024-03',
      amount: 500,
      // For PARENT-source requests, staffUserId stores the parent's userId.
      staffUserId: 'parent-1',
      staffNotes: 'Manual UPI',
      source: 'PARENT',
      proofImageUrl: 'https://r2.example/proof.jpg',
    });
  }

  function makeStudentEntity() {
    // Shape-compatible stand-in — the use-case only reads `.fullName`.
    return { id: { toString: () => 's1' }, fullName: 'Aarav Sharma' } as never;
  }

  function makeUseCase(pushService?: { sendToUsers: jest.Mock }) {
    const auditRecorder = { record: jest.fn() };
    return new RejectPaymentRequestUseCase(
      userRepo,
      studentRepo,
      prRepo,
      feeDueRepo,
      clock,
      auditRecorder,
      tx,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pushService as any,
    );
  }

  it('rejects a pending request and reverts the fee due to DUE', async () => {
    userRepo.findById.mockResolvedValue(makeOwner());
    prRepo.findById.mockResolvedValue(makeStaffSourceRequest());
    feeDueRepo.findByAcademyStudentMonth.mockResolvedValue(makeFeeDueDue());
    studentRepo.findById.mockResolvedValue(makeStudentEntity());

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      requestId: 'pr-1',
      reason: 'Proof unclear',
    });

    expect(result.ok).toBe(true);
    expect(prRepo.save).toHaveBeenCalled();
    expect(feeDueRepo.save).toHaveBeenCalled(); // due reverted
    expect(tx.run).toHaveBeenCalled();
  });

  it('rejects non-OWNER role', async () => {
    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      requestId: 'pr-1',
      reason: 'Proof unclear',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects empty rejection reason', async () => {
    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      requestId: 'pr-1',
      reason: '   ',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });

  it('rejects when request is not in PENDING status', async () => {
    userRepo.findById.mockResolvedValue(makeOwner());
    const approved = makeStaffSourceRequest().approve('owner-1', fixedNow);
    prRepo.findById.mockResolvedValue(approved);

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      requestId: 'pr-1',
      reason: 'Proof unclear',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  describe('parent push on PARENT-source rejection', () => {
    it('pushes to the parent (staffUserId) when source === PARENT', async () => {
      userRepo.findById.mockResolvedValue(makeOwner());
      prRepo.findById.mockResolvedValue(makeParentSourceRequest());
      feeDueRepo.findByAcademyStudentMonth.mockResolvedValue(makeFeeDueDue());
      studentRepo.findById.mockResolvedValue(makeStudentEntity());

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        requestId: 'pr-1',
        reason: 'Proof unclear',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).toHaveBeenCalledWith(
        ['parent-1'],
        expect.objectContaining({
          title: 'Payment needs attention',
          data: expect.objectContaining({ type: 'MANUAL_PAYMENT_REJECTED' }),
        }),
      );
    });

    it('does NOT push when source === STAFF', async () => {
      userRepo.findById.mockResolvedValue(makeOwner());
      prRepo.findById.mockResolvedValue(makeStaffSourceRequest());
      feeDueRepo.findByAcademyStudentMonth.mockResolvedValue(makeFeeDueDue());
      studentRepo.findById.mockResolvedValue(makeStudentEntity());

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        requestId: 'pr-1',
        reason: 'Proof unclear',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('returns ok even when push throws — rejection must not fail', async () => {
      userRepo.findById.mockResolvedValue(makeOwner());
      prRepo.findById.mockResolvedValue(makeParentSourceRequest());
      feeDueRepo.findByAcademyStudentMonth.mockResolvedValue(makeFeeDueDue());
      studentRepo.findById.mockResolvedValue(makeStudentEntity());

      const pushService = {
        sendToUsers: jest.fn().mockRejectedValue(new Error('FCM down')),
      };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        requestId: 'pr-1',
        reason: 'Proof unclear',
      });

      expect(result.ok).toBe(true);
      expect(prRepo.save).toHaveBeenCalled();
    });
  });
});
