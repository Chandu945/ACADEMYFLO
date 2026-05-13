import { SetupAcademyUseCase } from './setup-academy.usecase';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { CreateTrialSubscriptionUseCase } from '../../subscription/use-cases/create-trial-subscription.usecase';
import type { TransactionPort } from '../../common/transaction.port';
import { Academy } from '@domain/academy/entities/academy.entity';
import { createAuditFields, initSoftDelete, ok } from '@shared/kernel';

const ADDRESS = {
  line1: '123 Main St',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500001',
  country: 'India',
};

function buildDeps() {
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
  };
  // M1 academy-onboarding fix needs findById (to read the owner's
  // tokenVersion) and incrementTokenVersionByUserId (CAS bump) in addition
  // to updateAcademyId.
  const userRepo: jest.Mocked<
    Pick<UserRepository, 'updateAcademyId' | 'findById' | 'incrementTokenVersionByUserId'>
  > = {
    updateAcademyId: jest.fn(),
    findById: jest.fn().mockResolvedValue({ tokenVersion: 1 }),
    incrementTokenVersionByUserId: jest.fn().mockResolvedValue(true),
  };
  const createTrial = {
    execute: jest
      .fn()
      .mockResolvedValue(ok({ subscriptionId: 'sub-1', trialStartAt: '', trialEndAt: '' })),
  } as unknown as CreateTrialSubscriptionUseCase;
  // Inline transaction for unit tests — runs the callback directly. Real
  // MongoTransactionService behavior (commit/abort/retry) is exercised by e2e.
  const transaction: TransactionPort = {
    run: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  };
  return {
    academyRepo,
    userRepo: userRepo as unknown as UserRepository,
    createTrial,
    transaction,
  };
}

describe('SetupAcademyUseCase', () => {
  it('should create academy for owner', async () => {
    const { academyRepo, userRepo, createTrial, transaction } = buildDeps();
    academyRepo.findByOwnerUserId.mockResolvedValue(null);

    const uc = new SetupAcademyUseCase(academyRepo, userRepo, createTrial, transaction);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      academyName: 'Sunrise Academy',
      address: ADDRESS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.academyName).toBe('Sunrise Academy');
      expect(result.value.address.city).toBe('Hyderabad');
    }
    expect(academyRepo.save).toHaveBeenCalled();
  });

  it('should reject non-owner role', async () => {
    const { academyRepo, userRepo, createTrial, transaction } = buildDeps();

    const uc = new SetupAcademyUseCase(academyRepo, userRepo, createTrial, transaction);
    const result = await uc.execute({
      ownerUserId: 'staff-1',
      ownerRole: 'STAFF',
      academyName: 'Test Academy',
      address: ADDRESS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject duplicate academy setup', async () => {
    const { academyRepo, userRepo, createTrial, transaction } = buildDeps();
    const existingAcademy = Academy.reconstitute('academy-1', {
      ownerUserId: 'owner-1',
      academyName: 'Existing Academy',
      address: ADDRESS,
      loginDisabled: false,
      deactivatedAt: null,
      defaultDueDateDay: null,
      receiptPrefix: null,
      lateFeeEnabled: false,
      gracePeriodDays: 5,
      lateFeeAmountInr: 0,
      lateFeeRepeatIntervalDays: 5,
      audit: createAuditFields(),
      softDelete: initSoftDelete(),
    });
    academyRepo.findByOwnerUserId.mockResolvedValue(existingAcademy);

    const uc = new SetupAcademyUseCase(academyRepo, userRepo, createTrial, transaction);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      academyName: 'Another Academy',
      address: ADDRESS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('M1: bumps owner tokenVersion + invalidates auth cache after setup', async () => {
    // Pre-fix, the owner's existing JWT carried academyId=null in its
    // payload — and JwtAuthGuard reads request.user from the payload — so
    // every academy-scoped call after setup failed with academyRequired
    // until the user manually refreshed. M1 forces the refresh by bumping
    // tokenVersion (next request → version mismatch → 401 → refresh →
    // fresh JWT with new academyId) AND busting the cached user row so
    // the guard re-reads from DB even before the next refresh.
    const { academyRepo, userRepo, createTrial, transaction } = buildDeps();
    academyRepo.findByOwnerUserId.mockResolvedValue(null);
    const userAuthCache = {
      invalidate: jest.fn().mockResolvedValue(undefined),
      invalidateMany: jest.fn(),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };

    const uc = new SetupAcademyUseCase(
      academyRepo,
      userRepo,
      createTrial,
      transaction,
      audit,
      userAuthCache,
    );
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      academyName: 'Sunrise Academy',
      address: ADDRESS,
    });

    expect(result.ok).toBe(true);
    // tokenVersion bump uses CAS — passes the expected version we read.
    const userRepoMock = userRepo as unknown as {
      incrementTokenVersionByUserId: jest.Mock;
      updateAcademyId: jest.Mock;
    };
    expect(userRepoMock.incrementTokenVersionByUserId).toHaveBeenCalledWith('owner-1', 1);
    expect(userRepoMock.updateAcademyId).toHaveBeenCalled();
    // Cache bust happens post-commit (after the transaction). M1 fix.
    expect(userAuthCache.invalidate).toHaveBeenCalledWith('owner-1');
    // M3: ACADEMY_CREATED audit recorded with the new id + name.
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ACADEMY_CREATED',
        actorUserId: 'owner-1',
        entityType: 'ACADEMY',
        context: expect.objectContaining({ academyName: 'Sunrise Academy' }),
      }),
    );
  });

  it('M2: maps 11000 duplicate-key from the transaction to academyAlreadyExists', async () => {
    // The race: pre-check findByOwnerUserId(null) passes, but a concurrent
    // setup landed first and committed. Mongo's unique index throws 11000
    // on the loser. Pre-fix this bubbled as a 500. Post-fix it surfaces
    // as the same CONFLICT a user would get from the pre-check path.
    const { academyRepo, userRepo, createTrial } = buildDeps();
    academyRepo.findByOwnerUserId.mockResolvedValue(null);
    const transaction: TransactionPort = {
      run: async () => {
        throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      },
    };

    const uc = new SetupAcademyUseCase(academyRepo, userRepo, createTrial, transaction);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      academyName: 'Sunrise Academy',
      address: ADDRESS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });
});
