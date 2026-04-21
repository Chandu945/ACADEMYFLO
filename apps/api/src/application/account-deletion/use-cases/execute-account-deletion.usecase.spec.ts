import { ExecuteAccountDeletionUseCase } from './execute-account-deletion.usecase';
import type { AccountDeletionRequestRepository } from '@domain/account-deletion/ports/account-deletion-request.repository';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import type { DefaultDeletionStrategyRegistry, DeletionStrategy } from '../services/deletion-strategy';
import { ok, err, AppError, type Result } from '@shared/kernel';

function makeDueRequest(id: string) {
  let status: 'REQUESTED' | 'COMPLETED' = 'REQUESTED';
  return {
    id: { toString: () => id },
    userId: `user-${id}`,
    role: 'OWNER' as const,
    academyId: `academy-${id}`,
    get status() {
      return status;
    },
    isDue: () => true,
    markCompleted: () => {
      status = 'COMPLETED';
    },
  };
}

function buildDeps(strategy: DeletionStrategy) {
  const requests: jest.Mocked<AccountDeletionRequestRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findPendingByUserId: jest.fn(),
    findByCancelToken: jest.fn(),
    listDue: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const strategies = {
    for: jest.fn().mockReturnValue(strategy),
  } as unknown as DefaultDeletionStrategyRegistry;
  return { requests, audit, strategies };
}

describe('ExecuteAccountDeletionUseCase.sweep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // Regression guard for O1-H1: a single hanging deletion strategy used to
  // block the entire hourly tick. With the Promise.race timeout, the sweeper
  // now times out after 30s per request and continues with the next one.
  it('times out a hanging strategy and continues the sweep', async () => {
    const hangingStrategy: DeletionStrategy = {
      execute: jest.fn().mockImplementation(
        () => new Promise<Result<void>>(() => { /* never resolve */ }),
      ),
    };
    const deps = buildDeps(hangingStrategy);
    deps.requests.listDue.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeDueRequest('1') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeDueRequest('2') as any,
    ]);

    const uc = new ExecuteAccountDeletionUseCase(deps.requests, deps.strategies, deps.audit);
    const sweepPromise = uc.sweep(new Date(), 50);

    // Advance fake timers past the 30s per-request deadline for both requests
    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);

    const result = await sweepPromise;
    expect(result.timedOut).toBe(2);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(deps.requests.save).not.toHaveBeenCalled();
  });

  it('processes fast strategies without triggering the timeout', async () => {
    const fastStrategy: DeletionStrategy = {
      execute: jest.fn().mockResolvedValue(ok(undefined)),
    };
    const deps = buildDeps(fastStrategy);
    deps.requests.listDue.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeDueRequest('1') as any,
    ]);

    const uc = new ExecuteAccountDeletionUseCase(deps.requests, deps.strategies, deps.audit);
    const result = await uc.sweep(new Date(), 50);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.timedOut).toBe(0);
    expect(deps.requests.save).toHaveBeenCalledTimes(1);
    expect(deps.audit.record).toHaveBeenCalledTimes(1);
  });

  it('counts strategy failures separately from timeouts', async () => {
    const failingStrategy: DeletionStrategy = {
      execute: jest.fn().mockResolvedValue(err(AppError.validation('strategy refused'))),
    };
    const deps = buildDeps(failingStrategy);
    deps.requests.listDue.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeDueRequest('1') as any,
    ]);

    const uc = new ExecuteAccountDeletionUseCase(deps.requests, deps.strategies, deps.audit);
    const result = await uc.sweep(new Date(), 50);

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.timedOut).toBe(0);
  });

  it('returns zero counters when nothing is due', async () => {
    const strategy: DeletionStrategy = { execute: jest.fn() };
    const deps = buildDeps(strategy);
    deps.requests.listDue.mockResolvedValue([]);

    const uc = new ExecuteAccountDeletionUseCase(deps.requests, deps.strategies, deps.audit);
    const result = await uc.sweep(new Date(), 50);

    expect(result).toEqual({ processed: 0, failed: 0, timedOut: 0 });
    expect(strategy.execute).not.toHaveBeenCalled();
  });
});
