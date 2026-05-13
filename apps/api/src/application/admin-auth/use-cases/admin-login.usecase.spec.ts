import { AdminLoginUseCase } from './admin-login.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { TokenService } from '../../identity/ports/token-service.port';

function createAdmin(): User {
  const u = User.create({
    id: 'admin-1',
    fullName: 'Admin',
    email: 'admin@academyflo.com',
    phoneNumber: '+919876500001',
    role: 'SUPER_ADMIN',
    passwordHash: 'hash',
  });
  return User.reconstitute('admin-1', { ...u['props'] });
}

function createOwner(): User {
  const u = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876500002',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  return User.reconstitute('owner-1', { ...u['props'], academyId: 'academy-1' });
}

describe('AdminLoginUseCase (M1: ordering + M3: audit)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = {
      save: jest.fn(),
      findByUserAndDevice: jest.fn(),
      findActiveByDeviceId: jest.fn(),
      revokeByUserAndDevice: jest.fn(),
      updateRefreshToken: jest.fn(),
      revokeAllByUserIds: jest.fn(),
      deleteExpiredAndRevoked: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;
    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasher>;
    tokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      hashRefreshToken: jest.fn().mockReturnValue('refresh-hash'),
      verifyAccessToken: jest.fn(),
      compareRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    audit = { record: jest.fn().mockResolvedValue(undefined) };
  });

  function makeUc() {
    return new AdminLoginUseCase(
      userRepo,
      sessionRepo,
      hasher,
      tokenService,
      undefined,
      undefined,
      audit,
    );
  }

  it('M1: WRONG password on a non-admin email returns invalidCredentials (no role leak)', async () => {
    // The enumeration vector that M1 closed: pre-fix code returned the
    // distinct notSuperAdmin error the moment the email belonged to a
    // non-admin account, regardless of whether the password was correct.
    // An attacker could probe arbitrary emails to learn which were
    // registered as ordinary users vs SUPER_ADMINs. Post-fix: wrong
    // password is always invalidCredentials.
    await userRepo.save(createOwner());
    hasher.compare.mockResolvedValue(false);

    const result = await makeUc().execute({
      email: 'owner@test.com',
      password: 'wrong',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('M1: CORRECT password on a non-admin email returns notSuperAdmin (they own the creds)', async () => {
    // After password verification, surfacing notSuperAdmin is acceptable —
    // the caller has proven they own the account, so we're telling them
    // about THEIR OWN role, not enumerating others'.
    await userRepo.save(createOwner());
    hasher.compare.mockResolvedValue(true);

    const result = await makeUc().execute({
      email: 'owner@test.com',
      password: 'correct',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('M3: records ADMIN_LOGGED_IN against the SYSTEM sentinel academy', async () => {
    // Super-admins have academyId=null and the audit feed is academy-scoped;
    // we use 'SYSTEM' as a sentinel so admin login events have a forensic
    // home. Without this row, "show me every admin login last week" can
    // only be answered from operational logs (which roll off).
    await userRepo.save(createAdmin());
    hasher.compare.mockResolvedValue(true);

    const result = await makeUc().execute({
      email: 'admin@academyflo.com',
      password: 'correct',
    });

    expect(result.ok).toBe(true);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'SYSTEM',
        actorUserId: 'admin-1',
        action: 'ADMIN_LOGGED_IN',
        entityType: 'USER',
        context: expect.objectContaining({ email: 'admin@academyflo.com' }),
      }),
    );
  });

  it('no audit row on a failed admin login', async () => {
    // We don't audit failed attempts here — login-attempt-tracker handles
    // the brute-force defence, and audit rows for every brute-force
    // attempt would drown the feed. Pattern matches the /auth/login fix.
    await userRepo.save(createAdmin());
    hasher.compare.mockResolvedValue(false);

    const result = await makeUc().execute({
      email: 'admin@academyflo.com',
      password: 'wrong',
    });
    expect(result.ok).toBe(false);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
