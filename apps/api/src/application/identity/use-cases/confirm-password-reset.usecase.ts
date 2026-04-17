import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordResetChallengeRepository } from '@domain/identity/ports/password-reset-challenge.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { OtpHasher } from '../ports/otp-hasher.port';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderPasswordChangedEmail } from '../../notifications/templates/password-changed-template';
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
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly emailSender?: EmailSenderPort,
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

    // Check expiry and used status (but NOT attempts yet — that's done atomically below)
    if (challenge.isExpired() || challenge.isUsed()) {
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    // Atomically increment attempts FIRST to prevent concurrent requests from
    // bypassing the attempt limit. Each concurrent request will get its own
    // incremented count from the database, closing the TOCTOU race window.
    await this.challengeRepo.incrementAttempts(challenge.id.toString());

    // Re-fetch the challenge to get the authoritative post-increment attempt count
    const refreshedChallenge = await this.challengeRepo.findLatestActiveByUserId(userId);
    if (!refreshedChallenge || refreshedChallenge.hasExceededAttempts()) {
      return err(PasswordResetErrors.tooManyAttempts());
    }

    const otpValid = await this.otpHasher.compare(input.otp, refreshedChallenge.otpHash);

    if (!otpValid) {
      return err(PasswordResetErrors.invalidOrExpiredOtp());
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);

    const updated = User.reconstitute(userId, {
      ...user['props'],
      passwordHash: newHash,
      tokenVersion: user.tokenVersion + 1,
    });
    await this.userRepo.save(updated);
    // Note: user auth cache (user:auth:{userId}) will be invalidated on next
    // JWT check via tokenVersion mismatch, and expires naturally within 5 min TTL.

    await this.sessionRepo.revokeAllByUserIds([userId]);
    // Drop push tokens too — the password change may be a response to
    // device compromise, and stale tokens would keep delivering PII to it.
    await this.deviceTokenRepo.removeByUserIds([userId]);
    await this.challengeRepo.markUsed(challenge.id.toString());

    // Fire-and-forget: notify user about password change
    this.emailSender?.send({
      to: user.emailNormalized,
      subject: 'Your Academyflo Password Has Been Changed',
      html: renderPasswordChangedEmail({
        userName: user.fullName,
        userEmail: user.emailNormalized,
      }),
    }).catch(() => {});

    return ok({ message: 'Password reset successful.' });
  }
}
