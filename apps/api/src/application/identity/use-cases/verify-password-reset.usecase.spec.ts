import { VerifyPasswordResetUseCase } from './verify-password-reset.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordResetChallengeRepository } from '@domain/identity/ports/password-reset-challenge.repository';
import type { OtpHasher } from '../ports/otp-hasher.port';
import type { OtpAttemptTrackerPort } from '../services/otp-attempt-tracker';
import { User } from '@domain/identity/entities/user.entity';
import { PasswordResetChallenge } from '@domain/identity/entities/password-reset-challenge.entity';

function createMockUser(): User {
  return User.create({
    id: 'user-1',
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'old-hash',
  });
}

function createActiveChallenge(overrides: Partial<{
  attempts: number;
  verifiedAt: Date | null;
}> = {}): PasswordResetChallenge {
  return PasswordResetChallenge.reconstitute('c-1', {
    userId: 'user-1',
    otpHash: 'hashed-otp',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: overrides.attempts ?? 0,
    maxAttempts: 5,
    usedAt: null,
    verifiedAt: overrides.verifiedAt ?? null,
    createdAt: new Date(),
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
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };

  const challengeRepo: jest.Mocked<PasswordResetChallengeRepository> = {
    save: jest.fn(),
    findLatestActiveByUserId: jest.fn(),
    invalidateActiveByUserId: jest.fn(),
    markUsed: jest.fn(),
    markVerified: jest.fn(),
    incrementAttempts: jest.fn(),
  };

  const otpHasher: jest.Mocked<OtpHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const otpAttemptTracker: jest.Mocked<OtpAttemptTrackerPort> = {
    isLocked: jest.fn().mockResolvedValue(false),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordSuccess: jest.fn().mockResolvedValue(undefined),
  };

  return { userRepo, challengeRepo, otpHasher, otpAttemptTracker };
}

describe('VerifyPasswordResetUseCase', () => {
  it('marks the challenge verified on a correct OTP', async () => {
    const deps = buildDeps();
    const challenge = createActiveChallenge();
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId
      .mockResolvedValueOnce(challenge)
      .mockResolvedValueOnce(createActiveChallenge({ attempts: 1 }));
    deps.otpHasher.compare.mockResolvedValue(true);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '123456' });

    expect(result.ok).toBe(true);
    expect(deps.challengeRepo.incrementAttempts).toHaveBeenCalledWith('c-1');
    expect(deps.challengeRepo.markVerified).toHaveBeenCalledWith('c-1');
    expect(deps.otpAttemptTracker.recordSuccess).toHaveBeenCalledWith('test@example.com');
  });

  it('returns UNAUTHORIZED on a wrong OTP and increments attempts', async () => {
    const deps = buildDeps();
    const challenge = createActiveChallenge();
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId
      .mockResolvedValueOnce(challenge)
      .mockResolvedValueOnce(createActiveChallenge({ attempts: 1 }));
    deps.otpHasher.compare.mockResolvedValue(false);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '000000' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(deps.challengeRepo.incrementAttempts).toHaveBeenCalledWith('c-1');
    expect(deps.challengeRepo.markVerified).not.toHaveBeenCalled();
    expect(deps.otpAttemptTracker.recordFailure).toHaveBeenCalledWith('test@example.com');
  });

  it('returns UNAUTHORIZED when no active challenge exists (no enumeration)', async () => {
    const deps = buildDeps();
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId.mockResolvedValue(null);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '123456' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('returns FORBIDDEN when the per-email lockout is active', async () => {
    const deps = buildDeps();
    deps.otpAttemptTracker.isLocked.mockResolvedValue(true);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '123456' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(deps.userRepo.findByEmail).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the per-challenge cap is exceeded post-increment', async () => {
    const deps = buildDeps();
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId
      .mockResolvedValueOnce(createActiveChallenge({ attempts: 4 }))
      .mockResolvedValueOnce(createActiveChallenge({ attempts: 5 }));

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '123456' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(deps.otpHasher.compare).not.toHaveBeenCalled();
  });

  it('re-verifying with the same OTP after success does not burn another attempt', async () => {
    const deps = buildDeps();
    const verified = createActiveChallenge({ verifiedAt: new Date(Date.now() - 60_000) });
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId.mockResolvedValue(verified);
    deps.otpHasher.compare.mockResolvedValue(true);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '123456' });

    expect(result.ok).toBe(true);
    expect(deps.challengeRepo.incrementAttempts).not.toHaveBeenCalled();
  });

  it('re-verifying with a different OTP after success burns an attempt', async () => {
    const deps = buildDeps();
    const verified = createActiveChallenge({ verifiedAt: new Date(Date.now() - 60_000) });
    deps.userRepo.findByEmail.mockResolvedValue(createMockUser());
    deps.challengeRepo.findLatestActiveByUserId
      .mockResolvedValueOnce(verified)
      .mockResolvedValueOnce(createActiveChallenge({ attempts: 1, verifiedAt: new Date(Date.now() - 60_000) }));
    deps.otpHasher.compare.mockResolvedValue(false);

    const uc = new VerifyPasswordResetUseCase(
      deps.userRepo,
      deps.challengeRepo,
      deps.otpHasher,
      deps.otpAttemptTracker,
    );
    const result = await uc.execute({ email: 'test@example.com', otp: '999999' });

    expect(result.ok).toBe(false);
    expect(deps.challengeRepo.incrementAttempts).toHaveBeenCalledWith('c-1');
  });
});
