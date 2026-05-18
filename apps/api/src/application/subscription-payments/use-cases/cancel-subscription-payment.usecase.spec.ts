import { CancelSubscriptionPaymentUseCase } from './cancel-subscription-payment.usecase';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: { toString: () => 'user-1' },
    role: 'OWNER',
    academyId: 'academy-1',
    ...overrides,
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  // Real SubscriptionPayment entity is overkill — the use-case only reads
  // status / academyId / orderId / tierKey and calls markFailed.
  const base = {
    orderId: 'order-1',
    academyId: 'academy-1',
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED',
    tierKey: 'TIER_0_50',
    amountInr: 299,
  };
  const merged = { ...base, ...overrides };
  return {
    ...merged,
    markFailed: jest.fn().mockImplementation((_reason: string) => ({
      ...merged,
      status: 'FAILED' as const,
    })),
  };
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    userRepo: {
      findById: jest.fn().mockResolvedValue(makeUser()),
    },
    paymentRepo: {
      findByOrderId: jest.fn().mockResolvedValue(makePayment()),
      saveWithStatusPrecondition: jest.fn().mockResolvedValue(true),
    },
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    auditRecorder: {
      record: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function makeUc(deps: ReturnType<typeof makeDeps>) {
  return new CancelSubscriptionPaymentUseCase(
    deps.userRepo as never,
    deps.paymentRepo as never,
    deps.logger as never,
    deps.auditRecorder as never,
  );
}

describe('CancelSubscriptionPaymentUseCase', () => {
  it('transitions PENDING → FAILED with reason USER_CANCELLED', async () => {
    const deps = makeDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('FAILED');
    expect(deps.paymentRepo.saveWithStatusPrecondition).toHaveBeenCalled();
    // Verify audit was recorded with USER_CANCELLED reason
    expect(deps.auditRecorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBSCRIPTION_PAYMENT_FAILED',
        context: expect.objectContaining({ reason: 'USER_CANCELLED' }),
      }),
    );
  });

  it('is idempotent on already-FAILED payment (e.g. double-tap Cancel)', async () => {
    const deps = makeDeps({
      paymentRepo: {
        findByOrderId: jest.fn().mockResolvedValue(makePayment({ status: 'FAILED' })),
        saveWithStatusPrecondition: jest.fn(),
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('FAILED');
    expect(deps.paymentRepo.saveWithStatusPrecondition).not.toHaveBeenCalled();
    expect(deps.auditRecorder.record).not.toHaveBeenCalled();
  });

  it('preserves SUCCESS — webhook winning the race must not be clobbered', async () => {
    const deps = makeDeps({
      paymentRepo: {
        findByOrderId: jest.fn().mockResolvedValue(makePayment({ status: 'SUCCESS' })),
        saveWithStatusPrecondition: jest.fn(),
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('SUCCESS');
    expect(deps.paymentRepo.saveWithStatusPrecondition).not.toHaveBeenCalled();
  });

  it('on CAS race (concurrent webhook/poll transitioned first), surfaces authoritative state', async () => {
    const original = makePayment({ status: 'PENDING' });
    const successAfterRace = makePayment({ status: 'SUCCESS' });
    const deps = makeDeps({
      paymentRepo: {
        findByOrderId: jest
          .fn()
          .mockResolvedValueOnce(original) // initial fetch
          .mockResolvedValueOnce(successAfterRace), // re-fetch after CAS fails
        saveWithStatusPrecondition: jest.fn().mockResolvedValue(false), // CAS lost
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('SUCCESS');
  });

  it('rejects non-OWNER roles', async () => {
    const deps = makeDeps({
      userRepo: {
        findById: jest.fn().mockResolvedValue(makeUser({ role: 'STAFF' })),
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects cross-academy cancel — surfaces as NOT_FOUND to avoid leaking existence', async () => {
    const deps = makeDeps({
      paymentRepo: {
        findByOrderId: jest
          .fn()
          .mockResolvedValue(makePayment({ academyId: 'other-academy' })),
        saveWithStatusPrecondition: jest.fn(),
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'order-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(deps.paymentRepo.saveWithStatusPrecondition).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when the payment does not exist', async () => {
    const deps = makeDeps({
      paymentRepo: {
        findByOrderId: jest.fn().mockResolvedValue(null),
        saveWithStatusPrecondition: jest.fn(),
      },
    });

    const result = await makeUc(deps).execute({
      actorUserId: 'user-1',
      orderId: 'missing-order',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
