import { UpdateStaffUseCase } from './update-staff.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { User } from '@domain/identity/entities/user.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const u = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'h',
  });
  if (academyId) return User.reconstitute('owner-1', { ...u['props'], academyId });
  return u;
}

function createStaff(overrides: Partial<{ email: string; phoneNumber: string }> = {}): User {
  const u = User.create({
    id: 'staff-1',
    fullName: 'Priya Staff',
    email: overrides.email ?? 'priya@test.com',
    phoneNumber: overrides.phoneNumber ?? '+919876543211',
    role: 'STAFF',
    passwordHash: 'old-hash',
  });
  return User.reconstitute('staff-1', { ...u['props'], academyId: 'academy-1' });
}

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByPhone: jest.fn().mockResolvedValue(null),
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
    findById: jest.fn(),
    findByUserAndDevice: jest.fn(),
    findActiveByUserId: jest.fn(),
    revoke: jest.fn(),
    revokeAllByUserIds: jest.fn().mockResolvedValue(undefined),
    deleteExpiredAndRevoked: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue('new-hash'),
    compare: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const emailSender = {
    send: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailSenderPort>;
  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue({ academyName: 'Test Academy' } as unknown as never),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
  };
  return { userRepo, sessionRepo, hasher, audit, emailSender, academyRepo };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UpdateStaffUseCase(
    deps.userRepo,
    deps.hasher,
    deps.audit,
    deps.sessionRepo,
    deps.emailSender,
    deps.academyRepo,
  );
}

describe('UpdateStaffUseCase', () => {
  // M1 regression: audit records WHICH fields changed.
  it('M1: records changedFields in audit context', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff());

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      fullName: 'Priya K.',
      address: '42 Main St',
    });

    expect(result.ok).toBe(true);
    const call = deps.audit.record.mock.calls[0]![0];
    expect(call.action).toBe('STAFF_UPDATED');
    const changed = call.context?.['changedFields'] ?? '';
    expect(changed).toMatch(/fullName/);
    expect(changed).toMatch(/address/);
    expect(changed).not.toMatch(/email/);
    expect(changed).not.toMatch(/password/);
  });

  // M1 regression: no-op skip when nothing actually changed.
  it('M1: no-op skip when input matches current state', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff());

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      fullName: 'Priya Staff', // same as existing
      email: 'priya@test.com', // same as existing
    });

    expect(result.ok).toBe(true);
    expect(deps.userRepo.save).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // H3 regression: password change bumps tokenVersion AND revokes sessions.
  it('H3: password change revokes all sessions and bumps token version', async () => {
    const deps = buildDeps();
    const staff = createStaff();
    deps.userRepo.findById.mockResolvedValueOnce(createOwner()).mockResolvedValueOnce(staff);

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      password: 'NewP@ssw0rd!',
    });

    expect(result.ok).toBe(true);
    // Sessions revoked
    expect(deps.sessionRepo.revokeAllByUserIds).toHaveBeenCalledWith(['staff-1']);
    // Saved user has bumped tokenVersion
    const saved: User = deps.userRepo.save.mock.calls[0]![0];
    expect(saved.tokenVersion).toBe(staff.tokenVersion + 1);
    // Audit records password in changedFields
    const audit = deps.audit.record.mock.calls[0]![0];
    expect(audit.context?.['changedFields']).toMatch(/password/);
  });

  // H3: email change revokes sessions AND bumps tokenVersion so existing
  // access JWTs become invalid on next auth check (no 5-15 min residual
  // window after the rotation).
  it('H3: email change revokes sessions and bumps token version', async () => {
    const deps = buildDeps();
    const staff = createStaff();
    deps.userRepo.findById.mockResolvedValueOnce(createOwner()).mockResolvedValueOnce(staff);

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      email: 'priya.new@test.com',
    });

    expect(deps.sessionRepo.revokeAllByUserIds).toHaveBeenCalledWith(['staff-1']);
    const saved: User = deps.userRepo.save.mock.calls[0]![0];
    expect(saved.tokenVersion).toBe(staff.tokenVersion + 1);
  });

  // H3: phone change also bumps tokenVersion + revokes sessions.
  it('H3: phone change revokes sessions and bumps token version', async () => {
    const deps = buildDeps();
    const staff = createStaff();
    deps.userRepo.findById.mockResolvedValueOnce(createOwner()).mockResolvedValueOnce(staff);

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      phoneNumber: '+919999999999',
    });

    expect(deps.sessionRepo.revokeAllByUserIds).toHaveBeenCalledWith(['staff-1']);
    const saved: User = deps.userRepo.save.mock.calls[0]![0];
    expect(saved.tokenVersion).toBe(staff.tokenVersion + 1);
  });

  // M1: non-security changes (e.g. address) should NOT revoke sessions or
  // bump tokenVersion. Existing JWTs remain valid for the non-credential
  // change.
  it('non-credential update does NOT revoke sessions or bump tokenVersion', async () => {
    const deps = buildDeps();
    const staff = createStaff();
    deps.userRepo.findById.mockResolvedValueOnce(createOwner()).mockResolvedValueOnce(staff);

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      address: '7 New Park Rd',
    });

    expect(deps.sessionRepo.revokeAllByUserIds).not.toHaveBeenCalled();
    const saved: User = deps.userRepo.save.mock.calls[0]![0];
    expect(saved.tokenVersion).toBe(staff.tokenVersion);
  });

  // M2 regression: email staff when credentials change.
  it('M2: sends credentials-changed email on email change to both old and new address', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff({ email: 'priya.old@test.com' }));

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      email: 'priya.new@test.com',
    });

    // Both old and new email should receive the notice.
    const recipientSet = new Set(deps.emailSender.send.mock.calls.map((c) => c[0].to));
    expect(recipientSet.has('priya.new@test.com')).toBe(true);
    expect(recipientSet.has('priya.old@test.com')).toBe(true);
  });

  it('M2: sends credentials-changed email only to current address on password change', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff());

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      password: 'NewP@ssw0rd!',
    });

    expect(deps.emailSender.send).toHaveBeenCalledTimes(1);
    expect(deps.emailSender.send.mock.calls[0]![0].to).toBe('priya@test.com');
  });

  it('M2: does NOT send credentials email when only non-credential fields change', async () => {
    const deps = buildDeps();
    deps.userRepo.findById
      .mockResolvedValueOnce(createOwner())
      .mockResolvedValueOnce(createStaff());

    await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      address: 'New address',
    });

    expect(deps.emailSender.send).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      ownerUserId: 'staff-2',
      ownerRole: 'STAFF',
      staffId: 'staff-1',
      fullName: 'X',
    });

    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });
});
