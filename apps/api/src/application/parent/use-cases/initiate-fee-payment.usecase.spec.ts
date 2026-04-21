import { InitiateFeePaymentUseCase } from './initiate-fee-payment.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { ClockPort } from '../../common/clock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';

function createParent(academyId: string | null = null): User {
  const base = User.create({
    id: 'parent-1',
    fullName: 'Parent',
    email: 'parent@test.com',
    phoneNumber: '+919876543210',
    role: 'PARENT',
    passwordHash: 'hash',
  });
  if (academyId) return User.reconstitute('parent-1', { ...base['props'], academyId });
  return base;
}

function createFeeDue(
  academyId = 'academy-1',
  studentId = 'student-1',
  status: 'UPCOMING' | 'DUE' | 'PAID' = 'DUE',
): FeeDue {
  const due = FeeDue.create({
    id: 'fee-1',
    academyId,
    studentId,
    monthKey: '2026-04',
    dueDate: '2026-04-10',
    amount: 1500,
  });
  // Reconstitute with the desired status since create() starts as UPCOMING
  return FeeDue.reconstitute('fee-1', { ...(due as unknown as { props: Record<string, unknown> }).props, status } as never);
}

function createLink(parentUserId = 'parent-1', studentId = 'student-1', academyId = 'academy-1'): ParentStudentLink {
  return ParentStudentLink.create({
    id: 'link-1',
    parentUserId,
    studentId,
    academyId,
  });
}

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn(),
    countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
  };
  const linkRepo: jest.Mocked<ParentStudentLinkRepository> = {
    save: jest.fn(),
    findByParentAndStudent: jest.fn(),
    findByParentUserId: jest.fn().mockResolvedValue([]),
    findByStudentId: jest.fn(),
    findByAcademyId: jest.fn(),
    deleteByParentAndStudent: jest.fn(),
    deleteAllByParentUserId: jest.fn(),
    deleteAllByStudentId: jest.fn(),
  };
  const feeDueRepo: jest.Mocked<FeeDueRepository> = {
    save: jest.fn(),
    bulkSave: jest.fn(),
    findById: jest.fn(),
    bulkUpdateStatus: jest.fn(),
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
    countOverdueByAcademy: jest.fn(),
    listOverdueByAcademy: jest.fn(),
  };
  const feePaymentRepo: jest.Mocked<FeePaymentRepository> = {
    save: jest.fn(),
    saveWithStatusPrecondition: jest.fn().mockResolvedValue(true),
    findByOrderId: jest.fn(),
    findPendingByFeeDueId: jest.fn().mockResolvedValue(null),
    findByParentAndAcademy: jest.fn(),
  };
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
  };
  const cashfreeGateway: jest.Mocked<CashfreeGatewayPort> = {
    createOrder: jest.fn().mockResolvedValue({
      cfOrderId: 'cf-order-1',
      paymentSessionId: 'session-xyz',
      orderExpiryTime: '2026-04-22T10:00:00Z',
    }),
    getOrder: jest.fn(),
  };
  const clock: ClockPort = { now: () => new Date('2026-04-21T10:00:00Z') };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  return { userRepo, linkRepo, feeDueRepo, feePaymentRepo, academyRepo, cashfreeGateway, clock, logger, audit };
}

describe('InitiateFeePaymentUseCase', () => {
  function makeUc(deps: ReturnType<typeof buildDeps>, paymentsEnabled = true) {
    return new InitiateFeePaymentUseCase(
      deps.userRepo,
      deps.linkRepo,
      deps.feeDueRepo,
      deps.feePaymentRepo,
      deps.academyRepo,
      deps.cashfreeGateway,
      deps.clock,
      deps.logger,
      deps.audit,
      paymentsEnabled,
    );
  }

  it('fails fast when the kill-switch is disabled', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps, false).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FEATURE_DISABLED');
    // Nothing downstream should have been touched
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
    expect(deps.feePaymentRepo.save).not.toHaveBeenCalled();
  });

  it('rejects non-PARENT callers', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'OWNER',
      feeDueId: 'fee-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  // Security regression guard: a parent from academy-1 must NOT be able to
  // initiate payment for a fee due belonging to academy-other, even if they
  // know the feeDueId. The link match prevents direct-ID access across
  // tenants — this test documents that invariant.
  it('rejects initiate when fee due belongs to an academy the parent is not linked to', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue('academy-other'));
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink('parent-1', 'student-1', 'academy-1')]);

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(deps.feePaymentRepo.save).not.toHaveBeenCalled();
    expect(deps.cashfreeGateway.createOrder).not.toHaveBeenCalled();
  });

  it('rejects when parent has no links at all', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue());
    deps.linkRepo.findByParentUserId.mockResolvedValue([]);

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects already-paid fees', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue('academy-1', 'student-1', 'PAID'));
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink()]);

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    expect(deps.cashfreeGateway.createOrder).not.toHaveBeenCalled();
  });

  it('rejects when a PENDING payment already exists for the fee (double-tap guard)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue());
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink()]);
    deps.feePaymentRepo.findPendingByFeeDueId.mockResolvedValue({
      // Minimal stub — use-case only checks truthiness
      id: { toString: () => 'existing-payment' },
    } as unknown as Awaited<ReturnType<FeePaymentRepository['findPendingByFeeDueId']>>);

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    expect(deps.cashfreeGateway.createOrder).not.toHaveBeenCalled();
  });

  it('marks payment FAILED and returns provider-unavailable when Cashfree throws', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue());
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink()]);
    deps.cashfreeGateway.createOrder.mockRejectedValue(new Error('cashfree 500'));

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
    // save called twice: initial PENDING + markFailed
    expect(deps.feePaymentRepo.save).toHaveBeenCalledTimes(2);
    expect(deps.logger.error).toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('marks payment FAILED when Cashfree returns an incomplete response', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue());
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink()]);
    deps.cashfreeGateway.createOrder.mockResolvedValue({
      cfOrderId: '',
      paymentSessionId: '',
      orderExpiryTime: '2026-04-22T10:00:00Z',
    });

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
    expect(deps.feePaymentRepo.save).toHaveBeenCalledTimes(2);
  });

  it('happy path: creates PENDING payment, calls Cashfree, audits, returns session details', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createParent());
    deps.feeDueRepo.findById.mockResolvedValue(createFeeDue());
    deps.linkRepo.findByParentUserId.mockResolvedValue([createLink()]);

    const result = await makeUc(deps).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      feeDueId: 'fee-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.paymentSessionId).toBe('session-xyz');
      expect(result.value.currency).toBe('INR');
      expect(result.value.baseAmount).toBe(1500);
      expect(result.value.orderId).toMatch(/^FEE_/);
    }
    expect(deps.feePaymentRepo.save).toHaveBeenCalledTimes(2); // initial + with cf details
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FEE_PAYMENT_INITIATED', entityType: 'FEE_PAYMENT' }),
    );
  });
});
