import { LoginUseCase } from './login.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { TokenService } from '../ports/token-service.port';
import { User } from '@domain/identity/entities/user.entity';

function createMockUser(overrides: { role?: string; status?: string } = {}): User {
  return User.create({
    id: 'user-1',
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+919876543210',
    role: (overrides.role as 'OWNER') ?? 'OWNER',
    passwordHash: 'hashed',
  });
}

function createInactiveStaff(): User {
  const user = User.create({
    id: 'staff-1',
    fullName: 'Staff User',
    email: 'staff@example.com',
    phoneNumber: '+919876543211',
    role: 'STAFF',
    passwordHash: 'hashed',
  });
  // Reconstitute with INACTIVE status
  return User.reconstitute('staff-1', {
    ...user['props'],
    status: 'INACTIVE',
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

  const sessionRepo: jest.Mocked<SessionRepository> = {
    save: jest.fn(),
    findByUserAndDevice: jest.fn(),
    findActiveByDeviceId: jest.fn(),
    revokeByUserAndDevice: jest.fn(),
    updateRefreshToken: jest.fn(),
    revokeAllByUserIds: jest.fn(),
    deleteExpiredAndRevoked: jest.fn(),
  };

  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const tokenService: jest.Mocked<TokenService> = {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyAccessToken: jest.fn(),
    hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh'),
    compareRefreshToken: jest.fn(),
  };

  return { userRepo, sessionRepo, hasher, tokenService };
}

describe('LoginUseCase', () => {
  it('should login successfully with email', async () => {
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    const user = createMockUser();
    userRepo.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'test@example.com',
      password: 'Password1!',
      deviceId: 'device-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.accessToken).toBe('access-token');
      expect(result.value.refreshToken).toBe('refresh-token');
      expect(result.value.user.email).toBe('test@example.com');
    }
  });

  it('should login successfully with phone', async () => {
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    const user = createMockUser();
    userRepo.findByPhone.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: '+919876543210',
      password: 'Password1!',
    });

    expect(result.ok).toBe(true);
  });

  it('should fail with wrong password', async () => {
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    userRepo.findByEmail.mockResolvedValue(createMockUser());
    hasher.compare.mockResolvedValue(false);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'test@example.com',
      password: 'wrong',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should block inactive staff from login when password is correct', async () => {
    // H2 identity-audit fix: canLogin now runs AFTER password verification
    // (was BEFORE, leaking inactive-account status to anyone who knew the
    // email). Test the new ordering — inactive user with correct password
    // still gets FORBIDDEN, but with WRONG password gets UNAUTHORIZED like
    // any other failed login. The next test covers that wrong-password
    // path explicitly.
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    userRepo.findByEmail.mockResolvedValue(createInactiveStaff());
    hasher.compare.mockResolvedValue(true);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'staff@example.com',
      password: 'Password1!',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('H2: inactive staff with WRONG password gets UNAUTHORIZED (no status leak)', async () => {
    // The enumeration vector that H2 closed: pre-fix code surfaced
    // "Inactive user: <reason>" the moment the email matched a deactivated
    // account, regardless of whether the password was correct. An attacker
    // could probe any known email to learn its account status without
    // ever knowing the password. Post-fix: wrong password is always
    // "Invalid credentials" (UNAUTHORIZED) — the status check only runs
    // after password verification.
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    userRepo.findByEmail.mockResolvedValue(createInactiveStaff());
    hasher.compare.mockResolvedValue(false);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'staff@example.com',
      password: 'wrong',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should fail when user not found', async () => {
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    userRepo.findByEmail.mockResolvedValue(null);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'noone@example.com',
      password: 'Password1!',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should generate deviceId when not provided', async () => {
    const { userRepo, sessionRepo, hasher, tokenService } = buildDeps();
    userRepo.findByEmail.mockResolvedValue(createMockUser());
    hasher.compare.mockResolvedValue(true);

    const uc = new LoginUseCase(userRepo, sessionRepo, hasher, tokenService);
    const result = await uc.execute({
      identifier: 'test@example.com',
      password: 'Password1!',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.deviceId).toBeDefined();
      expect(result.value.deviceId.length).toBeGreaterThan(0);
    }
  });
});
