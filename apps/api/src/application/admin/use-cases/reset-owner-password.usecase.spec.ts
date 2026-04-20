import { ResetOwnerPasswordUseCase } from './reset-owner-password.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { PasswordGeneratorPort } from '../../common/password-generator.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Academy } from '@domain/academy/entities/academy.entity';
import { createAuditFields, initSoftDelete } from '@shared/kernel';

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

  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
  };

  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const passwordGenerator: jest.Mocked<PasswordGeneratorPort> = {
    generate: jest.fn(),
  };

  const auditRecorder: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const deviceTokenRepo: jest.Mocked<DeviceTokenRepository> = {
    upsert: jest.fn(),
    removeByUserIdAndToken: jest.fn(),
    removeByUserIds: jest.fn().mockResolvedValue(0),
    findByUserId: jest.fn(),
    findByUserIds: jest.fn(),
  };

  return { userRepo, sessionRepo, academyRepo, passwordHasher, passwordGenerator, auditRecorder, deviceTokenRepo };
}

function createOwner(): User {
  return User.create({
    id: 'owner-1',
    fullName: 'Test Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'old-hash',
  });
}

function createAcademyEntity(id = 'academy-1'): Academy {
  return Academy.reconstitute(id, {
    ownerUserId: 'owner-1',
    academyName: 'Test Academy',
    address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
    loginDisabled: false,
    deactivatedAt: null,
    defaultDueDateDay: null,
    receiptPrefix: null,
    lateFeeEnabled: false,
    gracePeriodDays: 5,
    lateFeeAmountInr: 0,
    lateFeeRepeatIntervalDays: 5,
    audit: createAuditFields(),
    softDelete: initSoftDelete(),
  });
}

describe('ResetOwnerPasswordUseCase', () => {
  it('should reset password, increment tokenVersion, and revoke sessions', async () => {
    const { userRepo, sessionRepo, academyRepo, passwordHasher, passwordGenerator, auditRecorder, deviceTokenRepo } = buildDeps();
    academyRepo.findById.mockResolvedValue(createAcademyEntity());
    userRepo.findById.mockResolvedValue(createOwner());
    passwordGenerator.generate.mockReturnValue('temp-pass-123');
    passwordHasher.hash.mockResolvedValue('new-hash');

    const uc = new ResetOwnerPasswordUseCase(
      userRepo,
      sessionRepo,
      academyRepo,
      passwordHasher,
      passwordGenerator,
      auditRecorder,
      deviceTokenRepo,
    );
    const result = await uc.execute({
      actorRole: 'SUPER_ADMIN',
      actorUserId: 'admin-1',
      academyId: 'academy-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.temporaryPassword).toBe('temp-pass-123');
      expect(result.value.ownerEmail).toBe('owner@test.com');
    }

    // Verify user was saved with incremented tokenVersion
    expect(userRepo.save).toHaveBeenCalled();
    const savedUser = userRepo.save.mock.calls[0]![0]!;
    expect(savedUser.passwordHash).toBe('new-hash');
    expect(savedUser.tokenVersion).toBe(1);

    // Verify sessions revoked
    expect(sessionRepo.revokeAllByUserIds).toHaveBeenCalledWith(['owner-1']);
  });

  it('should reject non-SUPER_ADMIN', async () => {
    const { userRepo, sessionRepo, academyRepo, passwordHasher, passwordGenerator, auditRecorder, deviceTokenRepo } = buildDeps();
    const uc = new ResetOwnerPasswordUseCase(
      userRepo,
      sessionRepo,
      academyRepo,
      passwordHasher,
      passwordGenerator,
      auditRecorder,
      deviceTokenRepo,
    );
    const result = await uc.execute({
      actorRole: 'OWNER',
      actorUserId: 'user-1',
      academyId: 'academy-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should return NOT_FOUND if academy does not exist', async () => {
    const { userRepo, sessionRepo, academyRepo, passwordHasher, passwordGenerator, auditRecorder, deviceTokenRepo } = buildDeps();
    academyRepo.findById.mockResolvedValue(null);

    const uc = new ResetOwnerPasswordUseCase(
      userRepo,
      sessionRepo,
      academyRepo,
      passwordHasher,
      passwordGenerator,
      auditRecorder,
      deviceTokenRepo,
    );
    const result = await uc.execute({
      actorRole: 'SUPER_ADMIN',
      actorUserId: 'admin-1',
      academyId: 'missing',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should return NOT_FOUND if owner does not exist', async () => {
    const { userRepo, sessionRepo, academyRepo, passwordHasher, passwordGenerator, auditRecorder, deviceTokenRepo } = buildDeps();
    academyRepo.findById.mockResolvedValue(createAcademyEntity());
    userRepo.findById.mockResolvedValue(null);

    const uc = new ResetOwnerPasswordUseCase(
      userRepo,
      sessionRepo,
      academyRepo,
      passwordHasher,
      passwordGenerator,
      auditRecorder,
      deviceTokenRepo,
    );
    const result = await uc.execute({
      actorRole: 'SUPER_ADMIN',
      actorUserId: 'admin-1',
      academyId: 'academy-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
