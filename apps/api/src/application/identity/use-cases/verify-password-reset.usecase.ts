import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordResetChallengeRepository } from '@domain/identity/ports/password-reset-challenge.repository';
import type { OtpHasher } from '../ports/otp-hasher.port';
import type { OtpAttemptTrackerPort } from '../services/otp-attempt-tracker';
import { PasswordResetErrors } from '../../common/errors';

interface VerifyPasswordResetInput {
  email: string;
  otp: string;
}

export interface VerifyPasswordResetOutput {
  message: string;
}

// Verifies an OTP for an active password-reset challenge without consuming
// it for the actual password change. On success, marks the challenge as
// verified so ConfirmPasswordResetUseCase can short-circuit its attempts
// increment for the happy path. Mirrors the lockout + atomic-increment +
// hash-compare logic of confirm to stay consistent in the brute-force
// defense surface.
export class VerifyPasswordResetUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly challengeRepo: PasswordResetChallengeRepository,
    private readonly otpHasher: OtpHasher,
    private readonly otpAttemptTracker: OtpAttemptTrackerPort,
  ) {}

  async execute(
    input: VerifyPasswordResetInput,
  ): Promise<Result<VerifyPasswordResetOutput, AppError>> {
    const email = input.email.toLowerCase().trim();

    if (await this.otpAttemptTracker.isLocked(email)) {
      return err(PasswordResetErrors.tooManyAttempts());
    }

    const user = await this.userRepo.findByEmail(email);

    // Same generic response surface as confirm — don't leak whether the
    // email exists.
    if (!user) {
      await this.otpAttemptTracker.recordFailure(email);
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    const userId = user.id.toString();
    const challenge = await this.challengeRepo.findLatestActiveByUserId(userId);

    if (!challenge) {
      await this.otpAttemptTracker.recordFailure(email);
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    if (challenge.isExpired() || challenge.isUsed()) {
      await this.otpAttemptTracker.recordFailure(email);
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    // If the user re-verifies with the same OTP after a successful first
    // verify (e.g. navigating back from the password screen), don't burn
    // another attempt — the hash already proved possession.
    if (challenge.isVerified()) {
      const stillValid = await this.otpHasher.compare(input.otp, challenge.otpHash);
      if (!stillValid) {
        // Different OTP submitted post-verify — that's an attempt.
        await this.challengeRepo.incrementAttempts(challenge.id.toString());
        const refreshed = await this.challengeRepo.findLatestActiveByUserId(userId);
        if (!refreshed || refreshed.hasExceededAttempts()) {
          await this.otpAttemptTracker.recordFailure(email);
          return err(PasswordResetErrors.tooManyAttempts());
        }
        await this.otpAttemptTracker.recordFailure(email);
        return err(PasswordResetErrors.invalidOrExpiredOtp());
      }
      return ok({ message: 'Verification successful.' });
    }

    // TOCTOU-safe: increment first, re-fetch to read the authoritative
    // post-increment count, then bail if over the cap.
    await this.challengeRepo.incrementAttempts(challenge.id.toString());
    const refreshed = await this.challengeRepo.findLatestActiveByUserId(userId);
    if (!refreshed || refreshed.hasExceededAttempts()) {
      await this.otpAttemptTracker.recordFailure(email);
      return err(PasswordResetErrors.tooManyAttempts());
    }

    const otpValid = await this.otpHasher.compare(input.otp, refreshed.otpHash);
    if (!otpValid) {
      await this.otpAttemptTracker.recordFailure(email);
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    await this.challengeRepo.markVerified(refreshed.id.toString());
    await this.otpAttemptTracker.recordSuccess(email);

    return ok({ message: 'Verification successful.' });
  }
}
