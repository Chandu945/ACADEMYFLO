import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordResetChallengeRepository } from '@domain/identity/ports/password-reset-challenge.repository';
import type { OtpGenerator } from '../ports/otp-generator.port';
import type { OtpHasher } from '../ports/otp-hasher.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderPasswordResetOtpEmail } from '../../notifications/templates/password-reset-otp-template';
import { PasswordResetChallenge } from '@domain/identity/entities/password-reset-challenge.entity';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { OtpAttemptTrackerPort } from '../services/otp-attempt-tracker';

interface RequestPasswordResetInput {
  email: string;
}

export interface RequestPasswordResetOutput {
  message: string;
}

const GENERIC_MESSAGE = 'If an account exists, a reset code has been sent.';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly challengeRepo: PasswordResetChallengeRepository,
    private readonly otpGenerator: OtpGenerator,
    private readonly otpHasher: OtpHasher,
    private readonly emailSender: EmailSenderPort,
    private readonly otpExpiryMinutes: number = 10,
    private readonly otpMaxAttempts: number = 5,
    private readonly otpCooldownSeconds: number = 60,
    private readonly audit?: AuditRecorderPort,
    private readonly otpAttemptTracker?: OtpAttemptTrackerPort,
  ) {}

  async execute(
    input: RequestPasswordResetInput,
  ): Promise<Result<RequestPasswordResetOutput, AppError>> {
    const email = input.email.toLowerCase().trim();

    // If the email is currently locked out from prior OTP-guessing attempts,
    // don't issue a fresh challenge — otherwise the attacker rotates the
    // OTP budget by cycling new challenges every 60s. Keep the response
    // generic so we don't reveal that the email exists OR is locked.
    if (this.otpAttemptTracker && (await this.otpAttemptTracker.isLocked(email))) {
      return ok({ message: GENERIC_MESSAGE });
    }

    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      return ok({ message: GENERIC_MESSAGE });
    }

    const userId = user.id.toString();
    const existing = await this.challengeRepo.findLatestActiveByUserId(userId);

    if (existing) {
      const cooldownEnd = new Date(
        existing.createdAt.getTime() + this.otpCooldownSeconds * 1000,
      );
      if (new Date() < cooldownEnd) {
        return ok({ message: GENERIC_MESSAGE });
      }
    }

    await this.challengeRepo.invalidateActiveByUserId(userId);

    const otp = this.otpGenerator.generate();
    const otpHash = await this.otpHasher.hash(otp);

    const challenge = PasswordResetChallenge.create({
      id: randomUUID(),
      userId,
      otpHash,
      expiresAt: new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000),
      maxAttempts: this.otpMaxAttempts,
    });

    await this.challengeRepo.save(challenge);

    try {
      await this.emailSender.send({
        to: email,
        subject: 'Your Academyflo password reset code',
        html: renderPasswordResetOtpEmail({ otp, expiryMinutes: this.otpExpiryMinutes }),
      });
    } catch {
      // OTP is saved — user can retry. Don't crash and don't leak account existence.
    }

    // Audit only when the user actually exists and belongs to an academy.
    // Parents may have academyId=null for some legacy records — skip those
    // rather than invent a fake tenant and keep the generic-response branch
    // (no user) silent so we don't create an enumeration oracle.
    if (user.academyId && this.audit) {
      await this.audit.record({
        academyId: user.academyId.toString(),
        actorUserId: userId,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: userId,
        context: { role: user.role },
      }).catch(() => {});
    }

    return ok({ message: GENERIC_MESSAGE });
  }
}
