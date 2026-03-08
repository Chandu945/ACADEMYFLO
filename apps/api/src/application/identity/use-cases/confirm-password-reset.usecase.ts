import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordResetChallengeRepository } from '@domain/identity/ports/password-reset-challenge.repository';
import type { OtpHasher } from '../ports/otp-hasher.port';
import type { PasswordHasher } from '../ports/password-hasher.port';
import { PasswordResetErrors } from '../../common/errors';

interface ConfirmPasswordResetInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ConfirmPasswordResetOutput {
  message: string;
}

export class ConfirmPasswordResetUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly challengeRepo: PasswordResetChallengeRepository,
    private readonly otpHasher: OtpHasher,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    input: ConfirmPasswordResetInput,
  ): Promise<Result<ConfirmPasswordResetOutput, AppError>> {
    const email = input.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    const userId = user.id.toString();
    const challenge = await this.challengeRepo.findLatestActiveByUserId(userId);

    if (!challenge) {
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    if (!challenge.canVerify()) {
      if (challenge.hasExceededAttempts()) {
        return err(PasswordResetErrors.tooManyAttempts());
      }
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    const otpValid = await this.otpHasher.compare(input.otp, challenge.otpHash);

    if (!otpValid) {
      await this.challengeRepo.incrementAttempts(challenge.id.toString());
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);

    const updated = User.reconstitute(userId, {
      ...user['props'],
      passwordHash: newHash,
      tokenVersion: user.tokenVersion + 1,
    });
    await this.userRepo.save(updated);

    await this.sessionRepo.revokeAllByUserIds([userId]);
    await this.challengeRepo.markUsed(challenge.id.toString());

    return ok({ message: 'Password reset successful.' });
  }
}
