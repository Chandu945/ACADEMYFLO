import { CancelPaymentRequestUseCase } from './cancel-payment-request.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import { User } from '@domain/identity/entities/user.entity';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';

describe('CancelPaymentRequestUseCase', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let studentRepo: jest.Mocked<StudentRepository>;
  let prRepo: jest.Mocked<PaymentRequestRepository>;

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
      listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<UserRepository>;

    studentRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      listActiveByAcademy: jest.fn(),
      countActiveByAcademy: jest.fn(),
    countScheduledStudentsByAcademyAndDate: jest.fn().mockResolvedValue(0),
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
      countPendingByStaffAndAcademy: jest.fn(),
      countPendingByAcademy: jest.fn(),
      countPendingByAuthorAndAcademySince: jest.fn(),
      listByAcademyAndStudent: jest.fn(),
      listPendingByStudentAndAcademy: jest.fn(),
      deleteAllByAcademyAndStudent: jest.fn(),
      deletePendingByAcademyAndStudent: jest.fn(),
    } as jest.Mocked<PaymentRequestRepository>;
  });

  function makeStaffUser(id = 'staff-1') {
    const u = User.create({
      id,
      fullName: 'Staff',
      email: `${id}@e.com`,
      phoneNumber: '+919876543210',
      role: 'STAFF',
      passwordHash: 'h',
    });
    return User.reconstitute(id, { ...u['props'], academyId: 'academy-1' });
  }

  function makeParentUser(id = 'parent-1') {
    const u = User.create({
      id,
      fullName: 'Parent',
      email: `${id}@e.com`,
      phoneNumber: '+919876543211',
      role: 'PARENT',
      passwordHash: 'h',
    });
    return User.reconstitute(id, { ...u['props'], academyId: 'academy-1' });
  }

  function makeOwnerUser() {
    const u = User.create({
      id: 'owner-1',
      fullName: 'Owner',
      email: 'owner@e.com',
      phoneNumber: '+919876543212',
      role: 'OWNER',
      passwordHash: 'h',
    });
    return User.reconstitute('owner-1', { ...u['props'], academyId: 'academy-1' });
  }

  function makeStaffSourceRequest(authorId = 'staff-1') {
    return PaymentRequest.create({
      id: 'pr-1',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'due-1',
      monthKey: '2024-03',
      amount: 500,
      staffUserId: authorId,
      staffNotes: 'Cash collected',
    });
  }

  function makeParentSourceRequest(parentId = 'parent-1') {
    return PaymentRequest.create({
      id: 'pr-1',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'due-1',
      monthKey: '2024-03',
      amount: 500,
      // staffUserId stores the parent's userId for PARENT-source PRs.
      staffUserId: parentId,
      staffNotes: 'Manual UPI',
      source: 'PARENT',
      proofImageUrl: 'https://r2.example/proof.jpg',
    });
  }

  function makeUseCase(pushService?: { sendToUsers: jest.Mock }) {
    const auditRecorder = { record: jest.fn() };
    return new CancelPaymentRequestUseCase(
      userRepo,
      studentRepo,
      prRepo,
      auditRecorder,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pushService as any,
    );
  }

  // ── Existing STAFF behavior (regression guard) ────────────────────────

  it('staff can cancel their own STAFF-source request', async () => {
    userRepo.findById.mockResolvedValue(makeStaffUser());
    prRepo.findById.mockResolvedValue(makeStaffSourceRequest('staff-1'));
    studentRepo.findById.mockResolvedValue({
      id: { toString: () => 's1' },
      fullName: 'Aarav',
    } as never);

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(true);
    expect(prRepo.save).toHaveBeenCalledTimes(1);
    const saved = prRepo.save.mock.calls[0]![0];
    expect(saved.status).toBe('CANCELLED');
  });

  it("staff cannot cancel another staff member's request", async () => {
    userRepo.findById.mockResolvedValue(makeStaffUser('staff-1'));
    // Request authored by a different staff member.
    prRepo.findById.mockResolvedValue(makeStaffSourceRequest('staff-2'));

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(prRepo.save).not.toHaveBeenCalled();
  });

  // ── M5: PARENT can now cancel their own PARENT-source requests ────────

  it('M5: parent can cancel their own PARENT-source request', async () => {
    userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
    prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-1'));
    studentRepo.findById.mockResolvedValue({
      id: { toString: () => 's1' },
      fullName: 'Aarav',
    } as never);

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(true);
    expect(prRepo.save).toHaveBeenCalledTimes(1);
    const saved = prRepo.save.mock.calls[0]![0];
    expect(saved.status).toBe('CANCELLED');
  });

  it("M5: parent cannot cancel another parent's request", async () => {
    userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
    // Request authored by a different parent.
    prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-2'));

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(prRepo.save).not.toHaveBeenCalled();
  });

  it('M5: parent cannot cancel a STAFF-source request (defense-in-depth)', async () => {
    // Force the unlikely path where ownership check would have passed
    // (same userId) but source is STAFF. The defense-in-depth gate fires
    // and blocks the cancel.
    userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
    const staffPR = PaymentRequest.create({
      id: 'pr-1',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'due-1',
      monthKey: '2024-03',
      amount: 500,
      // Hypothetically the same userId — could only happen via misconfig
      // or future regression. The source check stops it regardless.
      staffUserId: 'parent-1',
      staffNotes: 'STAFF source somehow with parent userId',
      source: 'STAFF',
    });
    prRepo.findById.mockResolvedValue(staffPR);

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(prRepo.save).not.toHaveBeenCalled();
  });

  // ── Other role gates (regression) ─────────────────────────────────────

  it('rejects OWNER role (owners use approve/reject, not cancel)', async () => {
    userRepo.findById.mockResolvedValue(makeOwnerUser());

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects when request is not PENDING', async () => {
    userRepo.findById.mockResolvedValue(makeStaffUser());
    const approved = makeStaffSourceRequest('staff-1').approve('owner-1', new Date());
    prRepo.findById.mockResolvedValue(approved);

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  it('maps ConcurrentModificationError on save to a notPending CONFLICT', async () => {
    // M5+M4 race: between our status check and our save, a concurrent path
    // (mark-fee-paid's M4 auto-resolve, or owner reject) transitioned the
    // PR out of PENDING. The save throws ConcurrentModificationError; this
    // mirrors the M2/M3 polish so the parent sees a clean CONFLICT instead
    // of the framework's generic ConcurrentModification 409.
    userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
    prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-1'));
    prRepo.save.mockRejectedValueOnce(new ConcurrentModificationError('PaymentRequest'));

    const uc = makeUseCase();
    const result = await uc.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      requestId: 'pr-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  // ── L7: owner notification on PARENT-cancel ─────────────────────────

  describe('L7: owner notification on PARENT cancel', () => {
    function makeStudent() {
      return { id: { toString: () => 's1' }, fullName: 'Aarav Sharma' } as never;
    }

    function makeOwnerList() {
      return {
        users: [{ id: { toString: () => 'owner-1' } }, { id: { toString: () => 'owner-2' } }],
        total: 2,
      };
    }

    it('sends a withdrawn push to all owners when a parent cancels', async () => {
      userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
      prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-1'));
      studentRepo.findById.mockResolvedValue(makeStudent());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userRepo.listByAcademyAndRole.mockResolvedValue(makeOwnerList() as any);

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'parent-1',
        actorRole: 'PARENT',
        requestId: 'pr-1',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).toHaveBeenCalledTimes(1);
      expect(pushService.sendToUsers).toHaveBeenCalledWith(
        ['owner-1', 'owner-2'],
        expect.objectContaining({
          title: 'Payment proof withdrawn',
          data: expect.objectContaining({
            type: 'MANUAL_PAYMENT_WITHDRAWN',
            studentName: 'Aarav Sharma',
          }),
        }),
      );
    });

    it('does NOT push owners when a STAFF cancels (verbal coordination assumed)', async () => {
      userRepo.findById.mockResolvedValue(makeStaffUser('staff-1'));
      prRepo.findById.mockResolvedValue(makeStaffSourceRequest('staff-1'));
      studentRepo.findById.mockResolvedValue(makeStudent());

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'staff-1',
        actorRole: 'STAFF',
        requestId: 'pr-1',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('does not fail the cancel if the push throws (best-effort delivery)', async () => {
      userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
      prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-1'));
      studentRepo.findById.mockResolvedValue(makeStudent());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userRepo.listByAcademyAndRole.mockResolvedValue(makeOwnerList() as any);

      const pushService = {
        sendToUsers: jest.fn().mockRejectedValue(new Error('FCM down')),
      };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'parent-1',
        actorRole: 'PARENT',
        requestId: 'pr-1',
      });

      // Cancel still succeeds; push failure is swallowed.
      expect(result.ok).toBe(true);
      expect(prRepo.save).toHaveBeenCalled();
    });

    it('no-ops the push when the academy has no owners (defensive)', async () => {
      userRepo.findById.mockResolvedValue(makeParentUser('parent-1'));
      prRepo.findById.mockResolvedValue(makeParentSourceRequest('parent-1'));
      studentRepo.findById.mockResolvedValue(makeStudent());
      userRepo.listByAcademyAndRole.mockResolvedValue({ users: [], total: 0 });

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);

      const result = await uc.execute({
        actorUserId: 'parent-1',
        actorRole: 'PARENT',
        requestId: 'pr-1',
      });

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });
  });
});
