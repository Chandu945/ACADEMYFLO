import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { Session } from '@domain/identity/entities/session.entity';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { TokenService } from '../../identity/ports/token-service.port';
import type { LoginAttemptTrackerPort } from '../../identity/services/login-attempt-tracker';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { AuthErrors } from '../../common/errors';
import { AdminErrors } from '../../common/errors';
import { randomUUID } from 'crypto';

/** Pre-hashed bcrypt dummy — used to equalize timing when user is not found */
const DUMMY_HASH = '$2b$12$KIX/LMmvTPRYOfx2n2PGauzE7xl8TZsI/2lDh.gPnJRFFWk4RYiGW';

export interface AdminLoginInput {
  email: string;
  password: string;
  deviceId?: string;
}

export interface AdminLoginOutput {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export class AdminLoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTtlSeconds: number = 2_592_000,
    private readonly loginAttemptTracker?: LoginAttemptTrackerPort,
    /**
     * M3 admin audit fix: records ADMIN_LOGGED_IN. Super-admin users have
     * academyId=null so we use a 'SYSTEM' sentinel for the audit row — the
     * audit feed is academy-scoped but we still need this row to land
     * somewhere for forensic queries. Optional so legacy fixtures compile.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: AdminLoginInput): Promise<Result<AdminLoginOutput, AppError>> {
    const emailLower = input.email.trim().toLowerCase();

    if (await this.loginAttemptTracker?.isLocked(emailLower)) {
      return err(AuthErrors.accountLocked());
    }

    const user = await this.userRepo.findByEmail(emailLower);

    if (!user) {
      await this.passwordHasher.compare(input.password, DUMMY_HASH);
      await this.loginAttemptTracker?.recordFailure(emailLower);
      return err(AuthErrors.invalidCredentials());
    }

    // M1 admin audit fix: verify the password BEFORE the role/status checks.
    // Pre-fix code returned `notSuperAdmin` for any registered non-admin
    // email regardless of whether the password was correct — letting an
    // attacker probe arbitrary emails to learn whether they belong to a
    // regular user vs a SUPER_ADMIN. Mirrors the Identity-section H2 fix
    // we shipped for /auth/login.
    const passwordValid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      await this.loginAttemptTracker?.recordFailure(emailLower);
      return err(AuthErrors.invalidCredentials());
    }

    if (user.role !== 'SUPER_ADMIN') {
      // Wrong password OR not-an-admin both look like invalidCredentials to
      // the caller. Only after the password matches do we acknowledge that
      // a non-admin actually exists — and even then we surface notSuperAdmin
      // (not invalidCredentials) because the credentials WERE valid, the
      // user just lacks the role to use this endpoint. They learn about
      // their own account, not someone else's.
      return err(AdminErrors.notSuperAdmin());
    }

    if (!user.isActive()) {
      return err(AuthErrors.invalidCredentials());
    }

    await this.loginAttemptTracker?.recordSuccess(emailLower);

    const deviceId = input.deviceId || randomUUID();

    await this.sessionRepo.revokeByUserAndDevice(user.id.toString(), deviceId);

    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const refreshTtlMs = this.refreshTtlSeconds * 1000;
    const session = Session.create({
      id: randomUUID(),
      userId: user.id.toString(),
      deviceId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + refreshTtlMs),
    });

    await this.sessionRepo.save(session);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id.toString(),
      role: user.role,
      email: user.emailNormalized,
      academyId: user.academyId,
      tokenVersion: user.tokenVersion,
    });

    // M3 admin audit fix: record ADMIN_LOGGED_IN against the 'SYSTEM'
    // sentinel academy so forensic queries on super-admin authentication
    // events have an audit-feed trace ("when did admin X sign in last,
    // and from where"). Fire-and-forget — audit infra outage must not
    // block admin from logging in to investigate that very outage.
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: 'SYSTEM',
          actorUserId: user.id.toString(),
          action: 'ADMIN_LOGGED_IN',
          entityType: 'USER',
          entityId: user.id.toString(),
          context: { deviceId, email: user.emailNormalized },
        })
        .catch(() => {});
    }

    return ok({
      accessToken,
      refreshToken,
      deviceId,
      user: {
        id: user.id.toString(),
        fullName: user.fullName,
        email: user.emailNormalized,
        role: user.role,
      },
    });
  }
}
