import { HandleFeePaymentWebhookUseCase, type FeeWebhookSignatureVerifier } from './handle-fee-payment-webhook.usecase';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { ClockPort } from '@application/common/clock.port';
import type { TransactionPort } from '@application/common/transaction.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { FeePayment } from '@domain/parent/entities/fee-payment.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';

// Freeze clock so webhook timestamp tolerance is deterministic. Webhook
// payloads below send timestamps matching this, so replay detection passes.
const FROZEN_NOW_MS = new Date('2026-04-21T10:00:00Z').getTime();

function makePayment(status: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING'): FeePayment {
  const created = FeePayment.create({
    id: 'payment-1',
    academyId: 'academy-1',
    parentUserId: 'parent-1',
    studentId: 'student-1',
    feeDueId: 'fee-1',
    monthKey: '2026-04',
    orderId: 'FEE_20260421_abc',
    paymentSessionId: 'session-xyz',
    baseAmount: 1500,
    convenienceFee: 30,
    totalAmount: 1530,
  });
  if (status === 'PENDING') return created;
  return FeePayment.reconstitute('payment-1', {
    ...(created as unknown as { props: Record<string, unknown> }).props,
    status,
  } as never);
}

function makeFeeDue(status: 'UPCOMING' | 'DUE' | 'PAID' = 'DUE'): FeeDue {
  const created = FeeDue.create({
    id: 'fee-1',
    academyId: 'academy-1',
    studentId: 'student-1',
    monthKey: '2026-04',
    dueDate: '2026-04-10',
    amount: 1500,
  });
  return FeeDue.reconstitute('fee-1', {
    ...(created as unknown as { props: Record<string, unknown> }).props,
    status,
  } as never);
}

function makePayload(overrides: {
  orderId?: string;
  status?: string;
  orderAmount?: number;
  cfPaymentId?: string;
} = {}): Buffer {
  const body = {
    data: {
      order: {
        order_id: overrides.orderId ?? 'FEE_20260421_abc',
        order_amount: overrides.orderAmount ?? 1530,
      },
      payment: {
        payment_status: overrides.status ?? 'SUCCESS',
        cf_payment_id: overrides.cfPaymentId ?? 'cf-pay-1',
      },
    },
  };
  return Buffer.from(JSON.stringify(body), 'utf-8');
}

function buildDeps() {
  const feePaymentRepo: jest.Mocked<FeePaymentRepository> = {
    save: jest.fn(),
    saveWithStatusPrecondition: jest.fn().mockResolvedValue(true),
    findByOrderId: jest.fn(),
    findPendingByFeeDueId: jest.fn(),
    findByParentAndAcademy: jest.fn(),
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
  const transactionLogRepo: jest.Mocked<TransactionLogRepository> = {
    save: jest.fn(),
    findByPaymentRequestId: jest.fn(),
    listByAcademy: jest.fn(),
    countByAcademyAndPrefix: jest.fn(),
    incrementReceiptCounter: jest.fn().mockResolvedValue(1),
    sumRevenueByAcademyAndDateRange: jest.fn(),
    listByAcademyAndDateRange: jest.fn(),
    findByFeeDueId: jest.fn(),
    listByStudentIds: jest.fn(),
    sumRevenueByAcademyGroupedByMonth: jest.fn(),
  };
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue({ receiptPrefix: 'RCP' }),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
  };
  const signatureVerifier: jest.Mocked<FeeWebhookSignatureVerifier> = {
    verify: jest.fn().mockReturnValue(true),
  };
  const clock: ClockPort = { now: () => new Date(FROZEN_NOW_MS) };
  const transaction: TransactionPort = { run: async <T>(fn: () => Promise<T>) => fn() };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { feePaymentRepo, feeDueRepo, transactionLogRepo, academyRepo, signatureVerifier, clock, transaction, logger, audit };
}

describe('HandleFeePaymentWebhookUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FROZEN_NOW_MS);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function makeUc(deps: ReturnType<typeof buildDeps>) {
    return new HandleFeePaymentWebhookUseCase(
      deps.feePaymentRepo,
      deps.feeDueRepo,
      deps.transactionLogRepo,
      deps.academyRepo,
      deps.signatureVerifier,
      deps.clock,
      deps.transaction,
      deps.logger,
      deps.audit,
    );
  }

  const okHeaders = () => ({
    signature: 'sig',
    timestamp: String(Math.floor(FROZEN_NOW_MS / 1000)),
  });

  it('rejects webhooks with invalid signature', async () => {
    const deps = buildDeps();
    deps.signatureVerifier.verify.mockReturnValue(false);

    const result = await makeUc(deps).execute(makePayload(), okHeaders());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(deps.feePaymentRepo.findByOrderId).not.toHaveBeenCalled();
  });

  it('rejects webhooks with stale timestamp (replay protection)', async () => {
    const deps = buildDeps();
    const staleTs = String(Math.floor(FROZEN_NOW_MS / 1000) - 120); // 2min old

    const result = await makeUc(deps).execute(makePayload(), { signature: 'sig', timestamp: staleTs });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts webhooks with Cashfree millisecond timestamps', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('SUCCESS'));

    const result = await makeUc(deps).execute(makePayload(), {
      signature: 'sig',
      timestamp: String(FROZEN_NOW_MS), // milliseconds form
    });
    // Should pass timestamp validation (early-returns ok on already-SUCCESS)
    expect(result.ok).toBe(true);
  });

  it('acks and no-ops for unknown orderId without crashing', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(null);

    const result = await makeUc(deps).execute(makePayload(), okHeaders());
    expect(result.ok).toBe(true);
    expect(deps.feePaymentRepo.save).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // Regression guard: idempotency against Cashfree's at-least-once delivery.
  // A second delivery of an already-SUCCESS payment must be a silent no-op —
  // no double audit, no double fee-due update, no double receipt.
  it('is idempotent on double-delivery (already-SUCCESS payment)', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('SUCCESS'));

    const result = await makeUc(deps).execute(makePayload(), okHeaders());
    expect(result.ok).toBe(true);
    expect(deps.feePaymentRepo.saveWithStatusPrecondition).not.toHaveBeenCalled();
    expect(deps.feeDueRepo.save).not.toHaveBeenCalled();
    expect(deps.transactionLogRepo.save).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('rejects webhooks whose order_amount mismatches stored totalAmount', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('PENDING'));

    const result = await makeUc(deps).execute(
      makePayload({ orderAmount: 9999 }), // stored is 1530
      okHeaders(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(deps.feePaymentRepo.saveWithStatusPrecondition).not.toHaveBeenCalled();
  });

  it('happy path: marks payment SUCCESS, updates fee due, writes receipt, audits', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('PENDING'));
    deps.feeDueRepo.findById.mockResolvedValue(makeFeeDue('DUE'));

    const result = await makeUc(deps).execute(makePayload(), okHeaders());

    expect(result.ok).toBe(true);
    expect(deps.feePaymentRepo.saveWithStatusPrecondition).toHaveBeenCalledWith(
      expect.anything(),
      'PENDING',
    );
    expect(deps.feeDueRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.transactionLogRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.transactionLogRepo.incrementReceiptCounter).toHaveBeenCalledWith('academy-1', 'RCP');
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FEE_PAYMENT_COMPLETED',
        entityType: 'FEE_PAYMENT',
      }),
    );
  });

  // Regression guard: saveWithStatusPrecondition returning false means another
  // concurrent webhook already transitioned PENDING→SUCCESS. We must NOT do
  // the fee-due update or write another receipt — otherwise two receipts are
  // issued for one payment.
  it('skips fee-due update when a concurrent webhook already transitioned the payment', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('PENDING'));
    deps.feeDueRepo.findById.mockResolvedValue(makeFeeDue('DUE'));
    deps.feePaymentRepo.saveWithStatusPrecondition.mockResolvedValue(false);

    const result = await makeUc(deps).execute(makePayload(), okHeaders());

    expect(result.ok).toBe(true);
    expect(deps.feeDueRepo.save).not.toHaveBeenCalled();
    expect(deps.transactionLogRepo.save).not.toHaveBeenCalled();
    expect(deps.transactionLogRepo.incrementReceiptCounter).not.toHaveBeenCalled();
    // No audit either — the concurrent path already emitted it
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // Money-path regression guard: if the fee was already marked PAID (e.g. owner
  // manually recorded offline payment) but Cashfree still collected money,
  // the webhook must emit FEE_PAYMENT_DUPLICATE_COLLECTED audit so ops can
  // trigger a manual refund. Failing to audit = silent double-collection.
  it('audits FEE_PAYMENT_DUPLICATE_COLLECTED when fee was already PAID', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('PENDING'));
    deps.feeDueRepo.findById.mockResolvedValue(makeFeeDue('PAID'));

    const result = await makeUc(deps).execute(makePayload(), okHeaders());

    expect(result.ok).toBe(true);
    expect(deps.logger.warn).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FEE_PAYMENT_DUPLICATE_COLLECTED',
      }),
    );
    // fee due was already PAID — must NOT write another receipt
    expect(deps.feeDueRepo.save).not.toHaveBeenCalled();
    expect(deps.transactionLogRepo.save).not.toHaveBeenCalled();
  });

  it('marks payment FAILED and audits on FAILED status', async () => {
    const deps = buildDeps();
    deps.feePaymentRepo.findByOrderId.mockResolvedValue(makePayment('PENDING'));

    const result = await makeUc(deps).execute(
      makePayload({ status: 'FAILED' }),
      okHeaders(),
    );
    expect(result.ok).toBe(true);
    expect(deps.feePaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FEE_PAYMENT_FAILED' }),
    );
    // Fee due must NOT be marked paid on failure
    expect(deps.feeDueRepo.save).not.toHaveBeenCalled();
  });

  it('acks payload with missing fields without crashing', async () => {
    const deps = buildDeps();

    const result = await makeUc(deps).execute(
      Buffer.from('{}', 'utf-8'),
      okHeaders(),
    );
    expect(result.ok).toBe(true);
    expect(deps.feePaymentRepo.findByOrderId).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON payloads', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute(Buffer.from('not json', 'utf-8'), okHeaders());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
});
