import { InviteParentUseCase } from './invite-parent.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';

function createOwner(academyId = 'academy-1'): User {
  const base = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  return User.reconstitute('owner-1', { ...base['props'], academyId });
}

function createStudent(academyId = 'academy-1', overrides: Partial<{ email: string | null }> = {}): Student {
  return Student.create({
    id: 'student-1',
    academyId,
    fullName: 'Test Student',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    guardian: {
      name: 'Parent Name',
      mobile: '+919876543299',
      email: overrides.email ?? 'parent@test.com',
    },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 1000,
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
  };

  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    findByIds: jest.fn(),
    findBirthdaysByAcademy: jest.fn(),
    findByEmailInAcademy: jest.fn(),
    findByPhoneInAcademy: jest.fn(),
    countInactiveByAcademy: jest.fn(),
    countNewAdmissionsByAcademyAndDateRange: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
  };

  const linkRepo: jest.Mocked<ParentStudentLinkRepository> = {
    save: jest.fn(),
    findByParentAndStudent: jest.fn().mockResolvedValue(null),
    findByParentUserId: jest.fn(),
    findByStudentId: jest.fn(),
    findByAcademyId: jest.fn(),
    deleteByParentAndStudent: jest.fn(),
    deleteAllByParentUserId: jest.fn(),
    deleteAllByStudentId: jest.fn(),
  };

  const academyRepo: jest.Mocked<AcademyRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByOwnerUserId: jest.fn(),
    findAllIds: jest.fn(),
  };

  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn(),
  };

  return { userRepo, studentRepo, linkRepo, academyRepo, passwordHasher };
}

describe('InviteParentUseCase', () => {
  function makeUc(deps: ReturnType<typeof buildDeps>) {
    return new InviteParentUseCase(
      deps.userRepo,
      deps.studentRepo,
      deps.linkRepo,
      deps.academyRepo,
      deps.passwordHasher,
      // emailSender intentionally omitted — happy path should work without it
    );
  }

  it('creates a new parent and link when no existing parent matches the guardian email', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.userRepo.findByEmail.mockResolvedValue(null);
    deps.userRepo.findByPhone.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isExistingUser).toBe(false);
      expect(result.value.tempPassword).not.toBe('');
      expect(result.value.parentEmail).toBe('parent@test.com');
    }
    expect(deps.userRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.linkRepo.save).toHaveBeenCalledTimes(1);
  });

  // Regression guard for F9-C4: re-inviting an already-invited parent+student
  // must NOT return a conflict error. Owners routinely double-click or retry
  // invites; the prior behavior surfaced `ParentErrors.linkAlreadyExists` which
  // UI treated as a hard failure. Now returns ok with empty tempPassword.
  it('returns ok (idempotent no-op) when the parent+student link already exists', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    const existingParent = User.create({
      id: 'parent-1',
      fullName: 'Existing Parent',
      email: 'parent@test.com',
      phoneNumber: '+919876543299',
      role: 'PARENT',
      passwordHash: 'hash',
    });
    deps.userRepo.findByEmail.mockResolvedValue(existingParent);
    deps.linkRepo.findByParentAndStudent.mockResolvedValue(
      ParentStudentLink.create({
        id: 'link-1',
        parentUserId: 'parent-1',
        studentId: 'student-1',
        academyId: 'academy-1',
      }),
    );

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isExistingUser).toBe(true);
      // No new credentials issued on retry — parent already has them, and we
      // intentionally don't rotate the password to avoid locking them out.
      expect(result.value.tempPassword).toBe('');
      expect(result.value.parentId).toBe('parent-1');
    }
    // Must NOT save a new link (idempotent no-op)
    expect(deps.linkRepo.save).not.toHaveBeenCalled();
    // Must NOT create a new user for an existing parent
    expect(deps.userRepo.save).not.toHaveBeenCalled();
  });

  it('creates a link for an existing parent user when no link exists yet', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    const existingParent = User.create({
      id: 'parent-1',
      fullName: 'Existing Parent',
      email: 'parent@test.com',
      phoneNumber: '+919876543299',
      role: 'PARENT',
      passwordHash: 'hash',
    });
    deps.userRepo.findByEmail.mockResolvedValue(existingParent);
    deps.linkRepo.findByParentAndStudent.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isExistingUser).toBe(true);
      expect(result.value.tempPassword).toBe('');
      expect(result.value.parentId).toBe('parent-1');
    }
    expect(deps.linkRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.userRepo.save).not.toHaveBeenCalled();
  });

  it('rejects when student belongs to a different academy', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-1'));
    deps.studentRepo.findById.mockResolvedValue(createStudent('academy-other'));

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(false);
    expect(deps.userRepo.save).not.toHaveBeenCalled();
    expect(deps.linkRepo.save).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER actors', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'STAFF',
      studentId: 'student-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects when email belongs to a non-PARENT existing user', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    const nonParent = User.create({
      id: 'staff-1',
      fullName: 'Staff',
      email: 'parent@test.com',
      phoneNumber: '+919876543299',
      role: 'STAFF',
      passwordHash: 'hash',
    });
    deps.userRepo.findByEmail.mockResolvedValue(nonParent);

    const result = await makeUc(deps).execute({
      ownerUserId: 'owner-1',
      ownerRole: 'OWNER',
      studentId: 'student-1',
    });
    expect(result.ok).toBe(false);
    expect(deps.linkRepo.save).not.toHaveBeenCalled();
  });
});
