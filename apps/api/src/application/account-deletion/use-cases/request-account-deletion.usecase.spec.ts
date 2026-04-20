import { RequestAccountDeletionUseCase } from './request-account-deletion.usecase';
import { User } from '@domain/identity/entities/user.entity';

function makeOwner() {
  // create() doesn't accept academyId (defaults null); use a stub that satisfies
  // the properties the use-case reads (role, academyId, isActive, passwordHash,
  // emailNormalized, fullName).
  return {
    id: { toString: () => 'owner-1' },
    role: 'OWNER' as const,
    academyId: 'academy-1',
    passwordHash: 'hash',
    emailNormalized: 'owner@a.com',
    fullName: 'Owner',
    isActive: () => true,
  } as unknown as ReturnType<typeof User.create>;
}

function buildDeps() {
  const users = {
    findById: jest.fn().mockResolvedValue(makeOwner()),
    save: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn(),
    countActiveByAcademyAndRole: jest.fn(),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
  };
  const sessions = {
    save: jest.fn(),
    findByUserAndDevice: jest.fn(),
    findActiveByDeviceId: jest.fn(),
    revokeByUserAndDevice: jest.fn(),
    updateRefreshToken: jest.fn(),
    revokeAllByUserIds: jest.fn().mockResolvedValue(undefined),
    deleteExpiredAndRevoked: jest.fn(),
  };
  const hasher = {
    hash: jest.fn(),
    compare: jest.fn().mockResolvedValue(true),
  };
  const requests = {
    save: jest.fn(),
    findPendingByUserId: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    listDueForExecution: jest.fn(),
    cancel: jest.fn(),
    markCompleted: jest.fn(),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return { users, sessions, hasher, requests, audit };
}

describe('RequestAccountDeletionUseCase', () => {
  it('revokes all sessions on successful deletion request', async () => {
    const deps = buildDeps();
    const uc = new RequestAccountDeletionUseCase(
      deps.users as never,
      deps.sessions as never,
      deps.hasher as never,
      deps.requests as never,
      deps.audit as never,
    );

    const result = await uc.execute({
      userId: 'owner-1',
      password: 'correct',
      confirmationPhrase: 'DELETE',
      reason: null,
      requestedFromIp: null,
    });

    expect(result.ok).toBe(true);
    expect(deps.sessions.revokeAllByUserIds).toHaveBeenCalledWith(['owner-1']);
  });

  it('does not revoke sessions when password is wrong', async () => {
    const deps = buildDeps();
    deps.hasher.compare.mockResolvedValue(false);
    const uc = new RequestAccountDeletionUseCase(
      deps.users as never,
      deps.sessions as never,
      deps.hasher as never,
      deps.requests as never,
      deps.audit as never,
    );

    const result = await uc.execute({
      userId: 'owner-1',
      password: 'wrong',
      confirmationPhrase: 'DELETE',
      reason: null,
      requestedFromIp: null,
    });

    expect(result.ok).toBe(false);
    expect(deps.sessions.revokeAllByUserIds).not.toHaveBeenCalled();
  });

  it('does not revoke sessions when phrase is wrong', async () => {
    const deps = buildDeps();
    const uc = new RequestAccountDeletionUseCase(
      deps.users as never,
      deps.sessions as never,
      deps.hasher as never,
      deps.requests as never,
      deps.audit as never,
    );

    const result = await uc.execute({
      userId: 'owner-1',
      password: 'correct',
      confirmationPhrase: 'not-delete',
      reason: null,
      requestedFromIp: null,
    });

    expect(result.ok).toBe(false);
    expect(deps.sessions.revokeAllByUserIds).not.toHaveBeenCalled();
  });
});
