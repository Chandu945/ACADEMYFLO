import { UpdateStudentUseCase } from './update-student.usecase';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const user = User.create({
    id: 'owner-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  if (academyId) {
    return User.reconstitute('owner-1', {
      ...user['props'],
      academyId,
    });
  }
  return user;
}

function createStudent(academyId = 'academy-1'): Student {
  return Student.create({
    id: 'student-1',
    academyId,
    fullName: 'Arun Sharma',
    dateOfBirth: new Date('2010-05-15'),
    gender: 'MALE',
    address: {
      line1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    guardian: {
      name: 'Raj Sharma',
      mobile: '+919876543210',
      email: 'raj@example.com',
    },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
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

  const auditRecorder = { record: jest.fn() };

  return { userRepo, studentRepo, auditRecorder };
}

describe('UpdateStudentUseCase', () => {
  it('should update student name', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    studentRepo.findById.mockResolvedValue(createStudent());

    const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      fullName: 'Updated Name',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fullName).toBe('Updated Name');
    }
    expect(studentRepo.saveWithVersionPrecondition).toHaveBeenCalled();
  });

  it('should allow OWNER to change monthly fee', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    studentRepo.findById.mockResolvedValue(createStudent());

    const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      monthlyFee: 1000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.monthlyFee).toBe(1000);
    }
  });

  it('should reject STAFF from changing monthly fee', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    const staff = User.create({
      id: 'staff-1',
      fullName: 'Staff User',
      email: 'staff@example.com',
      phoneNumber: '+919876543211',
      role: 'STAFF',
      passwordHash: 'hashed',
    });
    userRepo.findById.mockResolvedValue(
      User.reconstitute('staff-1', { ...staff['props'], academyId: 'academy-1' }),
    );
    studentRepo.findById.mockResolvedValue(createStudent());

    const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      studentId: 'student-1',
      monthlyFee: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject cross-academy update', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner('academy-2'));
    studentRepo.findById.mockResolvedValue(createStudent('academy-1'));

    const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      fullName: 'Updated',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject update of not-found student', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    studentRepo.findById.mockResolvedValue(null);

    const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'nonexistent',
      fullName: 'Updated',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  describe('M1: audit log records change details', () => {
    it('records the list of changed field names in the audit context', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        fullName: 'New Name',
        fatherName: 'New Father Name',
      });

      expect(result.ok).toBe(true);
      expect(auditRecorder.record).toHaveBeenCalledTimes(1);
      const auditCall = auditRecorder.record.mock.calls[0]![0];
      expect(auditCall.context.changedFields).toBe('fullName,fatherName');
    });

    it('records old + new monthlyFee in the audit context when fee changes', async () => {
      // The most-disputed field. Recording old/new directly lets owners
      // resolve "did the fee change?" questions from the audit log alone,
      // without needing to query history or call coaches.
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        monthlyFee: 750,
      });

      expect(result.ok).toBe(true);
      const auditCall = auditRecorder.record.mock.calls[0]![0];
      expect(auditCall.context.changedFields).toBe('monthlyFee');
      expect(auditCall.context.oldMonthlyFee).toBe('500');
      expect(auditCall.context.newMonthlyFee).toBe('750');
    });

    it('does NOT include monthlyFee old/new when fee was not changed', async () => {
      // Other-field updates shouldn't pollute the audit context with the
      // monthlyFee snapshot.
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        fullName: 'New Name',
      });

      expect(result.ok).toBe(true);
      const auditCall = auditRecorder.record.mock.calls[0]![0];
      expect(auditCall.context.oldMonthlyFee).toBeUndefined();
      expect(auditCall.context.newMonthlyFee).toBeUndefined();
    });

    it('skips save AND audit when no fields actually changed (no-op)', async () => {
      // A request that "updates" fields to their existing values changes
      // nothing — we shouldn't pollute the audit log with such a call, nor
      // do an unnecessary DB write.
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      const existing = createStudent();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(existing);

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        fullName: existing.fullName,
        monthlyFee: existing.monthlyFee,
      });

      expect(result.ok).toBe(true);
      expect(studentRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
      expect(auditRecorder.record).not.toHaveBeenCalled();
    });

    it('records dotted-notation field names for nested updates (address, guardian)', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        address: { line1: 'New Line 1', pincode: '500001' },
        guardian: { name: 'New Guardian Name', mobile: '+919999999999', email: 'g@e.com' },
      });

      expect(result.ok).toBe(true);
      const auditCall = auditRecorder.record.mock.calls[0]![0];
      // Nested-field names use dotted notation. We just check the patterns
      // appear — exact field-order isn't important to pin.
      expect(auditCall.context.changedFields).toMatch(/address\.line1/);
      expect(auditCall.context.changedFields).toMatch(/guardian\.name/);
    });
  });

  // L4 (student-management audit) — field-length / format validation.
  // The use case previously persisted unbounded strings for address,
  // guardian.name, fatherName, motherName, addressText, student.email,
  // mobileNumber, and whatsappNumber. These tests pin each cap so a
  // future regression that removes a validator fails immediately.
  describe('L4: field-length and format validation', () => {
    it('rejects address.line1 longer than 100 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        address: { line1: 'X'.repeat(101) },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('VALIDATION');
      expect(studentRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    });

    it('accepts address.line1 at the boundary (exactly 100 characters)', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        address: { line1: 'X'.repeat(100) },
      });

      expect(result.ok).toBe(true);
    });

    it('rejects city longer than 50 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        address: { city: 'X'.repeat(51) },
      });

      expect(result.ok).toBe(false);
    });

    it('rejects fatherName longer than 100 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        fatherName: 'X'.repeat(101),
      });

      expect(result.ok).toBe(false);
    });

    it('rejects addressText longer than 500 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        addressText: 'X'.repeat(501),
      });

      expect(result.ok).toBe(false);
    });

    it('rejects student email with bad format', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        email: 'not-an-email',
      });

      expect(result.ok).toBe(false);
    });

    it('rejects student email longer than 254 characters (RFC 5321)', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      // Build a syntactically valid but over-long email: 250 chars before @
      // + "@a.com" → 256 total.
      const longLocal = 'a'.repeat(250);
      const tooLong = `${longLocal}@a.com`;

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        email: tooLong,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects mobileNumber that is not E.164', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        mobileNumber: '9876543210', // missing +country
      });

      expect(result.ok).toBe(false);
    });

    it('rejects whatsappNumber that is not E.164', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        whatsappNumber: 'not-a-phone',
      });

      expect(result.ok).toBe(false);
    });

    it('still accepts an empty string for nullable optional fields (caller wants to clear)', async () => {
      // Empty-string clearing is a known UI pattern; the use case turns ''
      // into null on storage. Make sure the new validators don't fire on
      // it (length-0 passes any max-length check trivially).
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UpdateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        fatherName: '',
        motherName: '',
        addressText: '',
      });

      expect(result.ok).toBe(true);
    });
  });
});
