import { ChangePasswordUseCase } from './change-password.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';

function createParent(id = 'parent-1', academyId = 'academy-1', passwordHash = 'old-hash'): User {
  const u = User.create({
    id,
    fullName: 'Parent',
    email: `${id}@test.com`,
    phoneNumber: '+919876543210',
    role: 'PARENT',
    passwordHash,
  });
  return User.reconstitute(id, { ...u['props'], academyId });
}

describe('ChangePasswordUseCase (H1: session/token revocation + audit)', () => {
  let userRepo: InMemoryUserRepository;
  let hasher: jest.Mocked<PasswordHasher>;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let deviceTokenRepo: jest.Mocked<DeviceTokenRepository>;
  let audit: { record: jest.Mock };
  let useCase: ChangePasswordUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    await userRepo.save(createParent());
    hasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasher>;
    sessionRepo = {
      save: jest.fn(),
      findActiveByRefreshTokenHash: jest.fn(),
      revokeByUserAndDevice: jest.fn().mockResolvedValue(undefined),
      revokeAllByUserIds: jest.fn().mockResolvedValue(undefined),
      countActiveByUserId: jest.fn(),
      deleteExpiredAndRevoked: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;
    deviceTokenRepo = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      removeByUserIdAndToken: jest.fn(),
      removeByUserIds: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<DeviceTokenRepository>;
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    useCase = new ChangePasswordUseCase(userRepo, hasher, sessionRepo, deviceTokenRepo, audit);
  });

  const baseInput = {
    parentUserId: 'parent-1',
    parentRole: 'PARENT' as const,
    currentPassword: 'old-pass',
    newPassword: 'new-pass',
  };

  it('rejects non-PARENT actors as FORBIDDEN (was misleading childNotLinked pre-fix)', async () => {
    const result = await useCase.execute({ ...baseInput, parentRole: 'OWNER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects when current password does not match', async () => {
    hasher.compare.mockResolvedValueOnce(false);
    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    // No side-effects fired on failure.
    expect(sessionRepo.revokeAllByUserIds).not.toHaveBeenCalled();
    expect(deviceTokenRepo.removeByUserIds).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects new password equal to current (sameAsOld check)', async () => {
    // First compare = current matches; second compare = new also matches old.
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toMatch(/different from the current/i);
    }
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(sessionRepo.revokeAllByUserIds).not.toHaveBeenCalled();
  });

  it('revokes all sessions for the user on successful change (H1 core)', async () => {
    // confirm-password-reset already does this for the OTP path; H1 closes
    // the parity gap so an attacker holding a stolen JWT loses access as
    // soon as the parent rotates their password.
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const result = await useCase.execute(baseInput);

    expect(result.ok).toBe(true);
    expect(sessionRepo.revokeAllByUserIds).toHaveBeenCalledTimes(1);
    expect(sessionRepo.revokeAllByUserIds).toHaveBeenCalledWith(['parent-1']);
  });

  it('removes FCM device tokens on successful change (push stops on compromised device)', async () => {
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await useCase.execute(baseInput);

    expect(deviceTokenRepo.removeByUserIds).toHaveBeenCalledTimes(1);
    expect(deviceTokenRepo.removeByUserIds).toHaveBeenCalledWith(['parent-1']);
  });

  it('records PASSWORD_CHANGED in the audit feed', async () => {
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await useCase.execute(baseInput);

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'academy-1',
        actorUserId: 'parent-1',
        action: 'PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: 'parent-1',
        context: expect.objectContaining({ role: 'PARENT' }),
      }),
    );
  });

  it('still succeeds when sessionRepo / deviceTokenRepo throw (best-effort side-effects)', async () => {
    // The password save is the authoritative state change. If session revoke
    // or token cleanup fail (Redis down, network blip), rolling back the
    // password would leave the user with a known-broken old password — the
    // worst possible state. So side-effects swallow and the result is ok.
    sessionRepo.revokeAllByUserIds.mockRejectedValueOnce(new Error('redis down'));
    deviceTokenRepo.removeByUserIds.mockRejectedValueOnce(new Error('mongo blip'));
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(true);
  });

  it('works without sessionRepo / deviceTokenRepo / audit (legacy fixtures)', async () => {
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const legacy = new ChangePasswordUseCase(userRepo, hasher);

    const result = await legacy.execute(baseInput);
    expect(result.ok).toBe(true);
  });
});
