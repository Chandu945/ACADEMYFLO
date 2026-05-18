import { SetStaffStatusUseCase } from './set-staff-status.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { User } from '@domain/identity/entities/user.entity';

function createOwner(academyId = 'academy-1'): User {
  const user = User.create({
    id: 'owner-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  return User.reconstitute('owner-1', {
    ...user['props'],
    academyId,
  });
}

function createStaff(status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE', academyId = 'academy-1'): User {
  const user = User.create({
    id: 'staff-1',
    fullName: 'Staff User',
    email: 'staff@example.com',
    phoneNumber: '+919876543211',
    role: 'STAFF',
    passwordHash: 'hashed',
  });
  return User.reconstitute('staff-1', {
    ...user['props'],
    status,
    academyId,
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
  const sessionRepo: jest.Mocked<
    import('@domain/identity/ports/session.repository').SessionRepository
  > = {
    save: jest.fn(),
    findByUserAndDevice: jest.fn(),
    findActiveByDeviceId: jest.fn(),
    revokeByUserAndDevice: jest.fn(),
    updateRefreshToken: jest.fn(),
    revokeAllByUserIds: jest.fn(),
    deleteExpiredAndRevoked: jest.fn(),
  };
  const auditRecorder = { record: jest.fn() };
  const prRepo: jest.Mocked<
    import('@domain/fee/ports/payment-request.repository').PaymentRequestRepository
  > = {
    save: jest.fn(),
    findById: jest.fn(),
    findPendingByFeeDue: jest.fn(),
    listByAcademyAndStatuses: jest.fn().mockResolvedValue([]),
    listByStaffAndAcademy: jest.fn().mockResolvedValue([]),
    listByAcademyAndStudent: jest.fn().mockResolvedValue([]),
    countPendingByAcademy: jest.fn(),
    countPendingByStaffAndAcademy: jest.fn().mockResolvedValue(0),
    countPendingByAuthorAndAcademySince: jest.fn().mockResolvedValue(0),
    listPendingByStudentAndAcademy: jest.fn().mockResolvedValue([]),
    deleteAllByAcademyAndStudent: jest.fn(),
    deletePendingByAcademyAndStudent: jest.fn(),
    cancelPendingByStaffAndAcademy: jest.fn().mockResolvedValue(0),
  };
  return { userRepo, sessionRepo, auditRecorder, prRepo };
}

describe('SetStaffStatusUseCase', () => {
  it('should deactivate active staff', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff('ACTIVE');
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'INACTIVE',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('INACTIVE');
    }
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('should activate inactive staff', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff('INACTIVE');
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'ACTIVE',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('ACTIVE');
    }
  });

  it('should reject non-OWNER', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'staff-1',
      ownerRole: 'STAFF',
      staffId: 'staff-2',
      status: 'INACTIVE',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject cross-academy staff', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner('academy-1');
      if (id === 'staff-1') return createStaff('ACTIVE', 'academy-2');
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'INACTIVE',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject when staff not found', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner();
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'nonexistent',
      status: 'INACTIVE',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  // M3 regression: same-status submission is a no-op success.
  it('M3: same-status submission returns ok without saving or revoking', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    const owner = createOwner();
    const staff = createStaff('ACTIVE');
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return owner;
      if (id === 'staff-1') return staff;
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    const result = await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'ACTIVE', // matches current
    });

    expect(result.ok).toBe(true);
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(sessionRepo.revokeAllByUserIds).not.toHaveBeenCalled();
    expect(auditRecorder.record).not.toHaveBeenCalled();
    expect(prRepo.cancelPendingByStaffAndAcademy).not.toHaveBeenCalled();
  });

  // Cascade regression (staff analog of student-delete PR cleanup):
  // deactivation must mark pending PRs CANCELLED, not just count them.
  // Pre-fix the queue kept showing in-flight requests from staff who
  // were no longer around to clarify them.
  it('cascades: pending PRs are CANCELLED (not just counted) on deactivate', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    prRepo.cancelPendingByStaffAndAcademy.mockResolvedValue(3);
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff('ACTIVE');
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'INACTIVE',
    });

    expect(prRepo.cancelPendingByStaffAndAcademy).toHaveBeenCalledWith('staff-1', 'academy-1');
    expect(prRepo.listByStaffAndAcademy).not.toHaveBeenCalled();
    // Audit context records how many were cascaded.
    const auditCall = auditRecorder.record.mock.calls[0]![0];
    expect(auditCall.context?.['cancelledPendingPaymentRequests']).toBe('3');
    // And the old "just counted, did nothing" field is gone.
    expect(auditCall.context?.['pendingPaymentRequests']).toBeUndefined();
  });

  it('cascades: re-activate does NOT trigger the PR cancel (asymmetric)', async () => {
    const { userRepo, sessionRepo, auditRecorder, prRepo } = buildDeps();
    userRepo.findById.mockImplementation(async (id) => {
      if (id === 'owner-1') return createOwner();
      if (id === 'staff-1') return createStaff('INACTIVE');
      return null;
    });

    const uc = new SetStaffStatusUseCase(userRepo, sessionRepo, auditRecorder, prRepo);
    await uc.execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      staffId: 'staff-1',
      status: 'ACTIVE',
    });

    // Reactivating doesn't try to un-cancel anything; the cascade is
    // one-way (deactivation → cancel). Restoring stale PRs would create
    // confusing UX since they pre-date the reactivation event.
    expect(prRepo.cancelPendingByStaffAndAcademy).not.toHaveBeenCalled();
    const auditCall = auditRecorder.record.mock.calls[0]![0];
    expect(auditCall.context?.['cancelledPendingPaymentRequests']).toBeUndefined();
  });
});
