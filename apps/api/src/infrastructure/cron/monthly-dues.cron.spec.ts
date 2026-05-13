import { MonthlyDuesCronService } from './monthly-dues.cron';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { RunMonthlyDuesEngineUseCase } from '@application/fee/use-cases/run-monthly-dues-engine.usecase';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import type { JobLockPort } from '@application/common/ports/job-lock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { ok, err, AppError } from '@shared/kernel';

/**
 * Verifies the H2 fix: the per-academy try/catch in the monthly-dues cron.
 * The critical guarantee is "one bad academy must not stop the rest" —
 * tested by making the middle academy throw and asserting both the
 * upstream and downstream academies still process correctly.
 */
describe('MonthlyDuesCronService', () => {
  let academyRepo: { findAllIds: jest.Mock };
  let engine: { execute: jest.Mock };
  let auditRecorder: { record: jest.Mock };
  let jobLock: { withLock: jest.Mock };
  let logger: jest.Mocked<LoggerPort>;
  let cron: MonthlyDuesCronService;

  beforeEach(() => {
    academyRepo = { findAllIds: jest.fn() };
    engine = { execute: jest.fn() };
    auditRecorder = { record: jest.fn().mockResolvedValue(undefined) };
    // withLock simply invokes the inner function — we don't need real
    // locking semantics in the orchestration unit test.
    jobLock = { withLock: jest.fn().mockImplementation((_name, _ttl, fn) => fn()) };
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    cron = new MonthlyDuesCronService(
      academyRepo as unknown as AcademyRepository,
      engine as unknown as RunMonthlyDuesEngineUseCase,
      auditRecorder as unknown as AuditRecorderPort,
      jobLock as unknown as JobLockPort,
      logger,
    );
  });

  it('processes every academy and aggregates totals on the happy path', async () => {
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2', 'a3']);
    engine.execute.mockResolvedValue(
      ok({ created: 4, flippedToDue: 1, snapshotted: 0, backfilled: 0 }),
    );

    await cron.handleDuesGeneration();

    expect(engine.execute).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        academyCount: 3,
        totalCreated: 12,
        totalFlipped: 3,
        totalSnapshotted: 0,
        totalBackfilled: 0,
        totalFailed: 0,
        failedAcademyIds: [],
        backfilledAcademyIds: [],
      }),
    );
  });

  it('continues processing remaining academies when one throws (H2 guarantee)', async () => {
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2', 'a3']);

    // a1 succeeds, a2 throws (corrupt student), a3 succeeds.
    engine.execute
      .mockResolvedValueOnce(ok({ created: 5, flippedToDue: 0, snapshotted: 0, backfilled: 0 }))
      .mockRejectedValueOnce(new Error("Cannot read property 'getFullYear' of null"))
      .mockResolvedValueOnce(ok({ created: 3, flippedToDue: 0, snapshotted: 0, backfilled: 0 }));

    await cron.handleDuesGeneration();

    // All three academies were attempted — a2 didn't kill the loop.
    expect(engine.execute).toHaveBeenCalledTimes(3);

    // a1 and a3 produced audit entries; a2 did not (it threw before reaching the audit call).
    expect(auditRecorder.record).toHaveBeenCalledTimes(2);

    // The failing academy is logged with structured error context so ops
    // can find it.
    expect(logger.error).toHaveBeenCalledWith(
      'Monthly dues threw',
      expect.objectContaining({
        academyId: 'a2',
        error: "Cannot read property 'getFullYear' of null",
      }),
    );

    // Summary log reports the partial success.
    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        academyCount: 3,
        totalCreated: 8, // 5 + 3 from the successful runs
        totalFlipped: 0,
        totalFailed: 1,
        failedAcademyIds: ['a2'],
      }),
    );
  });

  it('logs a Result-err failure the same way as a thrown one', async () => {
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2']);
    engine.execute
      .mockResolvedValueOnce(ok({ created: 2, flippedToDue: 0, snapshotted: 0, backfilled: 0 }))
      .mockResolvedValueOnce(err(AppError.validation('invalid academy config')));

    await cron.handleDuesGeneration();

    expect(logger.error).toHaveBeenCalledWith(
      'Monthly dues failed (result err)',
      expect.objectContaining({
        academyId: 'a2',
        errorCode: 'VALIDATION',
        errorMessage: 'invalid academy config',
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        totalCreated: 2,
        totalFailed: 1,
        failedAcademyIds: ['a2'],
      }),
    );
  });

  it('caps failedAcademyIds in the summary log at 50 entries', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `a${i}`);
    academyRepo.findAllIds.mockResolvedValue(ids);
    engine.execute.mockRejectedValue(new Error('every academy throws'));

    await cron.handleDuesGeneration();

    expect(engine.execute).toHaveBeenCalledTimes(60);
    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        totalFailed: 60,
        failedAcademyIds: expect.any(Array),
      }),
    );
    const summaryCall = logger.info.mock.calls.find((c) => c[0] === 'Monthly dues cron completed');
    const failedIds = (summaryCall?.[1] as { failedAcademyIds: string[] }).failedAcademyIds;
    expect(failedIds).toHaveLength(50);
  });

  it('runs inside the job lock', async () => {
    academyRepo.findAllIds.mockResolvedValue(['a1']);
    engine.execute.mockResolvedValue(
      ok({ created: 1, flippedToDue: 0, snapshotted: 0, backfilled: 0 }),
    );

    await cron.handleDuesGeneration();

    expect(jobLock.withLock).toHaveBeenCalledWith(
      'monthly-dues',
      expect.any(Number),
      expect.any(Function),
    );
  });

  it('tracks backfilledAcademyIds and includes them in the summary log (M2)', async () => {
    // The M2 telemetry guarantee: when the engine reports backfilled > 0,
    // the cron records the academy ID and the totalBackfilled count so ops
    // can alert on real cron-skip-recovery events.
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2', 'a3']);
    engine.execute
      .mockResolvedValueOnce(ok({ created: 4, flippedToDue: 0, snapshotted: 0, backfilled: 0 }))
      .mockResolvedValueOnce(ok({ created: 4, flippedToDue: 0, snapshotted: 0, backfilled: 3 }))
      .mockResolvedValueOnce(ok({ created: 4, flippedToDue: 0, snapshotted: 0, backfilled: 0 }));

    await cron.handleDuesGeneration();

    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        totalBackfilled: 3,
        backfilledAcademyIds: ['a2'],
      }),
    );

    // The per-academy audit context records backfilled count so each run's
    // contribution is queryable.
    expect(auditRecorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'a2',
        context: expect.objectContaining({ backfilled: '3' }),
      }),
    );
  });

  it('skips audit entry when engine produces zero state changes (M4)', async () => {
    // The M4 fix: a quiet run (no created, no flipped, no snapshot, no
    // backfill) must not pollute the academy's audit log with a no-op
    // "Dues Engine Ran" entry. The structured `cron completed` log still
    // fires so ops still see daily proof the cron ran.
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2']);
    engine.execute.mockResolvedValue(
      ok({ created: 0, flippedToDue: 0, snapshotted: 0, backfilled: 0 }),
    );

    await cron.handleDuesGeneration();

    expect(engine.execute).toHaveBeenCalledTimes(2);
    // Zero audit entries — neither academy had a state change.
    expect(auditRecorder.record).not.toHaveBeenCalled();
    // Summary log still fires.
    expect(logger.info).toHaveBeenCalledWith(
      'Monthly dues cron completed',
      expect.objectContaining({
        academyCount: 2,
        totalCreated: 0,
        totalFlipped: 0,
        totalSnapshotted: 0,
        totalBackfilled: 0,
      }),
    );
  });

  it('records audit entry when only snapshotted is non-zero (M4)', async () => {
    // A snapshot-only run can happen when the owner enables late fee
    // mid-month and the legacy-backfill loop snapshots the records past
    // grace. Nothing was created or flipped, but a real state change
    // happened — the late-fee policy got attached to existing dues. This
    // still warrants an audit entry.
    academyRepo.findAllIds.mockResolvedValue(['a1']);
    engine.execute.mockResolvedValue(
      ok({ created: 0, flippedToDue: 0, snapshotted: 7, backfilled: 0 }),
    );

    await cron.handleDuesGeneration();

    expect(auditRecorder.record).toHaveBeenCalledTimes(1);
    expect(auditRecorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'a1',
        action: 'MONTHLY_DUES_ENGINE_RAN',
        context: expect.objectContaining({
          created: '0',
          flippedToDue: '0',
          snapshotted: '7',
          backfilled: '0',
        }),
      }),
    );
  });

  it('records one audit entry per academy that had state change, skips quiet ones (M4)', async () => {
    // Mixed run: only a2 had any state change. a1 and a3 stay out of the
    // audit log so a2's real event isn't buried by silent neighbors.
    academyRepo.findAllIds.mockResolvedValue(['a1', 'a2', 'a3']);
    engine.execute
      .mockResolvedValueOnce(ok({ created: 0, flippedToDue: 0, snapshotted: 0, backfilled: 0 }))
      .mockResolvedValueOnce(ok({ created: 0, flippedToDue: 5, snapshotted: 0, backfilled: 0 }))
      .mockResolvedValueOnce(ok({ created: 0, flippedToDue: 0, snapshotted: 0, backfilled: 0 }));

    await cron.handleDuesGeneration();

    expect(auditRecorder.record).toHaveBeenCalledTimes(1);
    expect(auditRecorder.record).toHaveBeenCalledWith(expect.objectContaining({ academyId: 'a2' }));
  });
});
