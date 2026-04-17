import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { Session } from '@domain/identity/entities/session.entity';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { TokenService } from '../ports/token-service.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderOwnerWelcomeEmail } from '../../notifications/templates/owner-welcome-template';
import { AuthErrors } from '../../common/errors';
import { randomUUID } from 'crypto';

export interface OwnerSignupInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  deviceId?: string;
}

export interface OwnerSignupOutput {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: string;
    status: string;
    profilePhotoUrl: string | null;
  };
}

export class OwnerSignupUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTtlSeconds: number = 2_592_000,
    private readonly emailSender?: EmailSenderPort,
  ) {}

  async execute(input: OwnerSignupInput): Promise<Result<OwnerSignupOutput, AppError>> {
    const existingByEmail = await this.userRepo.findByEmail(input.email.trim().toLowerCase());
    if (existingByEmail) {
      return err(AuthErrors.duplicateEmail());
    }

    const existingByPhone = await this.userRepo.findByPhone(input.phoneNumber.trim());
    if (existingByPhone) {
      return err(AuthErrors.duplicatePhone());
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const userId = randomUUID();

    const user = User.create({
      id: userId,
      fullName: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      role: 'OWNER',
      passwordHash,
    });

    try {
      await this.userRepo.save(user);
    } catch (e: unknown) {
      // Handle MongoDB duplicate key error (E11000) from concurrent signups
      if (e instanceof Error && e.message.includes('E11000')) {
        return err(AuthErrors.duplicateEmail());
      }
      throw e;
    }

    const deviceId = input.deviceId || randomUUID();
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const refreshTtlMs = this.refreshTtlSeconds * 1000;
    const session = Session.create({
      id: randomUUID(),
      userId,
      deviceId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + refreshTtlMs),
    });

    await this.sessionRepo.save(session);

    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      role: user.role,
      email: user.emailNormalized,
      academyId: user.academyId,
      tokenVersion: user.tokenVersion,
    });

    // Fire-and-forget: send welcome email to new owner
    this.emailSender?.send({
      to: user.emailNormalized,
      subject: 'Welcome to Academyflo!',
      html: renderOwnerWelcomeEmail({
        ownerName: user.fullName,
        email: user.emailNormalized,
      }),
    }).catch(() => {});

    return ok({
      accessToken,
      refreshToken,
      deviceId,
      user: {
        id: user.id.toString(),
        fullName: user.fullName,
        email: user.emailNormalized,
        phoneNumber: user.phoneE164,
        role: user.role,
        status: user.status,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    });
  }
}
