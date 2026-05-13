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

function createStudent(
  academyId = 'academy-1',
  overrides: Partial<{ email: string | null }> = {},
): Student {
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
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };

  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    countScheduledStudentsByAcademyAndDate: jest.fn().mockResolvedValue(0),
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
    saveWithVersionPrecondition: jest.fn(),
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

  it('allows STAFF to invite a parent', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.userRepo.findByEmail.mockResolvedValue(null);
    deps.userRepo.findByPhone.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      ownerUserId: 'staff-1',
      ownerRole: 'STAFF',
      studentId: 'student-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.userRepo.save).toHaveBeenCalledTimes(1);
    expect(deps.linkRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects PARENT actors', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      ownerUserId: 'parent-1',
      ownerRole: 'PARENT',
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

  // Bundle A — invite-parent hardening (L1 + L2 + L3 from student-management audit).
  // All three issues were birthday-paradox / brute-force class problems where the
  // entropy of generated values was too low for the volume of invites a busy
  // academy generates. Each test pins the *shape* of the new format so a future
  // regression (someone reverting to Date.now or shrinking the random window)
  // fails immediately.
  describe('Bundle A: dummy-credential entropy', () => {
    // Build a student with no guardian.email AND no student.email, so the
    // use case is forced down the dummy-email branch. We bypass createStudent
    // because its `??` fallback resolves nullish to a real address.
    function createStudentNoEmail(id = 'student-1'): Student {
      return Student.create({
        id,
        academyId: 'academy-1',
        fullName: 'Test Student',
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
        address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
        guardian: {
          name: 'Parent Name',
          mobile: '+919876543299',
          email: '',
        },
        joiningDate: new Date('2024-01-01'),
        monthlyFee: 1000,
      });
    }

    it('L1: dummy login email uses an 8-hex-char random suffix when guardian has no email', async () => {
      const deps = buildDeps();
      deps.userRepo.findById.mockResolvedValue(createOwner());
      deps.studentRepo.findById.mockResolvedValue(createStudentNoEmail());
      deps.userRepo.findByEmail.mockResolvedValue(null);
      deps.userRepo.findByPhone.mockResolvedValue(null);

      const result = await makeUc(deps).execute({
        ownerUserId: 'owner-1',
        ownerRole: 'OWNER',
        studentId: 'student-1',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Format: {cleaned_name}_{8 hex chars}@academyflo.com
      // Pre-fix used 4 digits (\\d{4}) → birthday-paradox collision at ~95
      // same-name students per academy.
      expect(result.value.parentEmail).toMatch(/^test_student_[0-9a-f]{8}@academyflo\.com$/);
    });

    it('L1: 20 invites for the same nameless-email student produce distinct dummy emails', async () => {
      // Demonstrates the collision resistance: even with identical name input,
      // the random suffix produces a fresh email each call.
      const emails = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const deps = buildDeps();
        deps.userRepo.findById.mockResolvedValue(createOwner());
        deps.studentRepo.findById.mockResolvedValue(createStudentNoEmail());
        deps.userRepo.findByEmail.mockResolvedValue(null);
        deps.userRepo.findByPhone.mockResolvedValue(null);

        const result = await makeUc(deps).execute({
          ownerUserId: 'owner-1',
          ownerRole: 'OWNER',
          studentId: 'student-1',
        });
        if (result.ok) emails.add(result.value.parentEmail);
      }
      // 20 runs, 4-billion-option suffix → P(collision) is ~5e-8.
      expect(emails.size).toBe(20);
    });

    it('L2: phone placeholder is a valid Indian mobile and is unique across same-millisecond invites', async () => {
      // Pre-fix used Date.now().slice(-10) → two invites in the same ms
      // produced identical phones → guaranteed 11000 collision under load.
      const savedPhones: string[] = [];

      // Run the use case 10x in a tight loop. With Date.now()-based phones,
      // several of these would share a millisecond and produce duplicates.
      for (let i = 0; i < 10; i++) {
        const deps = buildDeps();
        deps.userRepo.findById.mockResolvedValue(createOwner());
        // Student with no guardian phone so the placeholder branch fires.
        const studentNoPhone = Student.create({
          id: `student-${i}`,
          academyId: 'academy-1',
          fullName: `Student ${i}`,
          dateOfBirth: new Date('2010-01-01'),
          gender: 'MALE',
          address: { line1: '1 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
          guardian: { name: 'Parent', mobile: '', email: `parent${i}@test.com` },
          joiningDate: new Date('2024-01-01'),
          monthlyFee: 1000,
        });
        deps.studentRepo.findById.mockResolvedValue(studentNoPhone);
        deps.userRepo.findByEmail.mockResolvedValue(null);
        deps.userRepo.findByPhone.mockResolvedValue(null);
        deps.userRepo.save.mockImplementation(async (user) => {
          // user.phone is a Phone value object — use phoneE164 for the string.
          savedPhones.push(user.phoneE164);
        });

        await makeUc(deps).execute({
          ownerUserId: 'owner-1',
          ownerRole: 'OWNER',
          studentId: `student-${i}`,
        });
      }

      // Sanity: we expected 10 saves. Anything lower means the branch
      // didn't fire on every iteration and the test isn't measuring what
      // we think.
      expect(savedPhones.length).toBe(10);

      // All phones must be valid E.164 Indian mobiles (+91 followed by
      // 9XXXXXXXXX — the leading 9 keeps it within TRAI mobile range).
      for (const p of savedPhones) {
        expect(p).toMatch(/^\+919\d{9}$/);
      }
      // All 10 placeholders must be unique even though they fired in <1ms.
      expect(new Set(savedPhones).size).toBe(savedPhones.length);
    });

    it('L3: temp password is 16 hex characters (64 bits of entropy)', async () => {
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
      if (!result.ok) return;
      // Pre-fix: 8 hex chars (32 bits) — brute-forceable in seconds on
      // modern hardware. Post-fix: 16 hex chars (64 bits) — far outside
      // a one-time-use brute-force window.
      expect(result.value.tempPassword).toMatch(/^[0-9a-f]{16}$/);
      expect(result.value.tempPassword.length).toBe(16);
    });
  });

  describe('M3: audit recording (parent-flows audit)', () => {
    function makeUcWithAudit(deps: ReturnType<typeof buildDeps>, audit: { record: jest.Mock }) {
      return new InviteParentUseCase(
        deps.userRepo,
        deps.studentRepo,
        deps.linkRepo,
        deps.academyRepo,
        deps.passwordHasher,
        undefined,
        audit,
      );
    }

    it('records PARENT_INVITED on a successful new invite', async () => {
      const deps = buildDeps();
      deps.userRepo.findById.mockResolvedValue(createOwner());
      deps.studentRepo.findById.mockResolvedValue(createStudent());
      deps.userRepo.findByEmail.mockResolvedValue(null);
      deps.userRepo.findByPhone.mockResolvedValue(null);
      const audit = { record: jest.fn().mockResolvedValue(undefined) };

      await makeUcWithAudit(deps, audit).execute({
        ownerUserId: 'owner-1',
        ownerRole: 'OWNER',
        studentId: 'student-1',
      });

      expect(audit.record).toHaveBeenCalledTimes(1);
      const entry = audit.record.mock.calls[0][0];
      expect(entry).toEqual(
        expect.objectContaining({
          academyId: 'academy-1',
          actorUserId: 'owner-1',
          action: 'PARENT_INVITED',
          entityType: 'PARENT_STUDENT_LINK',
        }),
      );
      // tempPassword MUST NOT appear in the audit context — defeats the
      // rotation if it leaks into the audit feed.
      const ctx = entry.context as Record<string, string>;
      for (const v of Object.values(ctx)) {
        expect(v).not.toMatch(/^[0-9a-f]{16}$/);
      }
      expect(ctx.studentId).toBe('student-1');
      expect(ctx.isExistingUser).toBe('false');
    });

    it('does NOT record on idempotent retry (link already exists)', async () => {
      // M3 design choice: the idempotent retry path returns ok without any
      // mutation. Recording an audit entry per double-click would inflate
      // the feed with noise and confuse "who invited this parent" queries.
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
      const audit = { record: jest.fn().mockResolvedValue(undefined) };

      await makeUcWithAudit(deps, audit).execute({
        ownerUserId: 'owner-1',
        ownerRole: 'OWNER',
        studentId: 'student-1',
      });

      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
