import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { Session } from '@domain/identity/entities/session.entity';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { TokenService } from '../ports/token-service.port';
import type { LoginAttemptTrackerPort } from '../services/login-attempt-tracker';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { canLogin } from '@domain/identity/rules/auth.rules';
import { AuthErrors } from '../../common/errors';
import { randomUUID } from 'crypto';

/** Pre-hashed bcrypt dummy — used to equalize timing when user is not found */
const DUMMY_HASH = '$2b$12$KIX/LMmvTPRYOfx2n2PGauzE7xl8TZsI/2lDh.gPnJRFFWk4RYiGW';

/**
 * Normalize a free-form phone identifier into the strict E.164 format the
 * User.phoneE164 field is stored in. Returns null when the input can't be
 * interpreted as a phone — caller treats that as "no user found" (with
 * timing-equalized response, see findByPhone path).
 *
 * Bug context: mobile + user-web both strip the `+` before sending the
 * login identifier (their normaliseIdentifier helpers do `replace(/[\s\-+()]/g, '')`),
 * so `+919876543210`, `91 98765 43210`, `9876543210` all arrived here as
 * digit strings like `919876543210` or `9876543210` and failed the exact
 * findOne({ phoneE164 }) lookup against the stored `+919876543210`. Every
 * login-by-phone returned "Invalid credentials" regardless of password.
 * Normalizing here is defense in depth — the clients are also being fixed
 * but any future client (third-party, internal tool) that sends raw digits
 * now works.
 *
 * Indian-number assumption matches the rest of the project (signup DTO
 * regex, student form, enquiry entity all bake +91 in).
 */
function normalizePhoneIdentifier(raw: string): string | null {
  // Strip formatting but KEEP a leading + if present.
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned; // already E.164
  const digits = cleaned.replace(/^\+/, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`; // 10-digit Indian number
  if (/^91\d{10}$/.test(digits)) return `+${digits}`; // already has 91 country code
  return null;
}

export interface LoginInput {
  identifier: string;
  password: string;
  deviceId?: string;
}

export interface LoginOutput {
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

export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTtlSeconds: number = 2_592_000,
    private readonly loginAttemptTracker?: LoginAttemptTrackerPort,
    /**
     * M3 identity-audit fix: records USER_LOGGED_IN in the audit feed.
     * Skipped when the user has no academyId (super-admin / mid-onboarding)
     * since the audit feed is academy-scoped. Optional so legacy fixtures
     * compile without the new wiring.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, AppError>> {
    const identifier = input.identifier.trim();
    const identifierLower = identifier.toLowerCase();

    // Check account lockout before any other processing
    if (await this.loginAttemptTracker?.isLocked(identifierLower)) {
      return err(AuthErrors.accountLocked());
    }

    let user: User | null = null;

    // Try email first, then phone
    if (identifier.includes('@')) {
      user = await this.userRepo.findByEmail(identifierLower);
    } else {
      const phoneE164 = normalizePhoneIdentifier(identifier);
      // Unparseable phone falls through to user=null below, which hits the
      // dummy-bcrypt timing equalizer and returns the generic invalid-
      // credentials error — same surface as a wrong email.
      user = phoneE164 ? await this.userRepo.findByPhone(phoneE164) : null;
    }

    if (!user) {
      await this.passwordHasher.compare(input.password, DUMMY_HASH);
      await this.loginAttemptTracker?.recordFailure(identifierLower);
      return err(AuthErrors.invalidCredentials());
    }

    // H2 identity-audit fix: verify the password BEFORE surfacing
    // account-status information. Pre-fix code returned the distinct
    // "Inactive user: <reason>" error whenever a known email belonged to
    // an INACTIVE account — letting an attacker probe the status of any
    // email they had. Now: wrong password is always "Invalid credentials"
    // regardless of account state. Only after a correct password do we
    // tell the user their account is inactive (which they're entitled
    // to know).
    const passwordValid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      await this.loginAttemptTracker?.recordFailure(identifierLower);
      return err(AuthErrors.invalidCredentials());
    }

    const loginCheck = canLogin(user);
    if (!loginCheck.allowed) {
      return err(AuthErrors.inactiveUser(loginCheck.reason!));
    }

    const deviceId = input.deviceId || randomUUID();

    // Revoke existing session for this device
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

    // Reset attempt counter on successful login
    await this.loginAttemptTracker?.recordSuccess(identifierLower);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id.toString(),
      role: user.role,
      email: user.emailNormalized,
      academyId: user.academyId,
      tokenVersion: user.tokenVersion,
    });

    // M3 identity-audit fix: record the login. Skipped for users without
    // an academy (super-admin or pre-onboarding owner) since audit rows
    // are academy-scoped. Fire-and-forget so audit infra hiccup never
    // blocks the user's login.
    if (this.auditRecorder && user.academyId) {
      await this.auditRecorder
        .record({
          academyId: user.academyId,
          actorUserId: user.id.toString(),
          action: 'USER_LOGGED_IN',
          entityType: 'USER',
          entityId: user.id.toString(),
          context: { role: user.role, source: 'password', deviceId },
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
        phoneNumber: user.phoneE164,
        role: user.role,
        status: user.status,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    });
  }
}
