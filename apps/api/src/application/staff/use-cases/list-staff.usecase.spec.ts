import { ListStaffUseCase } from './list-staff.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
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

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn().mockResolvedValue({ users: [], total: 0 }),
    countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };
  return { userRepo };
}

describe('ListStaffUseCase', () => {
  // M4 regression: status filter must reach the repo so `total` reflects
  // the filtered set. Prior code filtered current page in memory which
  // left `total` pointing at the full set — pagination UI lied.
  it('M4: passes status filter through to the repo', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    await new ListStaffUseCase(deps.userRepo).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      page: 1,
      pageSize: 20,
      status: 'ACTIVE',
    });

    // The status arg (5th param) must arrive at the repo, not be applied
    // post-fetch in memory.
    expect(deps.userRepo.listByAcademyAndRole).toHaveBeenCalledWith(
      'academy-1',
      'STAFF',
      1,
      20,
      'ACTIVE',
    );
  });

  it('M4: omits status when not provided so caller gets both ACTIVE and INACTIVE', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    await new ListStaffUseCase(deps.userRepo).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      page: 1,
      pageSize: 20,
    });

    expect(deps.userRepo.listByAcademyAndRole).toHaveBeenCalledWith(
      'academy-1',
      'STAFF',
      1,
      20,
      undefined,
    );
  });

  it('returns pagination metadata correctly when results exist', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const staff = User.create({
      id: 'staff-1',
      fullName: 'Staff One',
      email: 's1@e.com',
      phoneNumber: '+919876500001',
      role: 'STAFF',
      passwordHash: 'h',
    });
    deps.userRepo.listByAcademyAndRole.mockResolvedValue({
      users: [User.reconstitute('staff-1', { ...staff['props'], academyId: 'academy-1' })],
      total: 25,
    });

    const result = await new ListStaffUseCase(deps.userRepo).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      page: 2,
      pageSize: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toHaveLength(1);
      expect(result.value.meta).toEqual({
        page: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
      });
    }
  });

  it('rejects non-OWNER', async () => {
    const deps = buildDeps();
    const result = await new ListStaffUseCase(deps.userRepo).execute({
      ownerUserId: 'staff-1',
      ownerRole: 'STAFF',
      page: 1,
      pageSize: 20,
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });
});
