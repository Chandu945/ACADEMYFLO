import { CreateStudentUseCase } from './create-student.usecase';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { User } from '@domain/identity/entities/user.entity';

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

const validInput = {
  actorUserId: 'owner-1',
  actorRole: 'OWNER' as const,
  fullName: 'Arun Sharma',
  dateOfBirth: '2010-05-15',
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
  joiningDate: '2024-01-01',
  monthlyFee: 500,
};

describe('CreateStudentUseCase', () => {
  it('should create a student successfully', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fullName).toBe('Arun Sharma');
      expect(result.value.gender).toBe('MALE');
      expect(result.value.status).toBe('ACTIVE');
      expect(result.value.academyId).toBe('academy-1');
      expect(result.value.monthlyFee).toBe(500);
    }
    expect(studentRepo.save).toHaveBeenCalled();
  });

  it('should allow STAFF to create students', async () => {
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

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({ ...validInput, actorUserId: 'staff-1', actorRole: 'STAFF' });

    expect(result.ok).toBe(true);
  });

  it('should reject SUPER_ADMIN', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      ...validInput,
      actorUserId: 'admin-1',
      actorRole: 'SUPER_ADMIN',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject when actor has no academy', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner(null));

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ACADEMY_SETUP_REQUIRED');
    }
  });

  it('should reject invalid gender', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({ ...validInput, gender: 'UNKNOWN' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('should reject non-integer monthly fee', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({ ...validInput, monthlyFee: 99.5 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('should reject invalid pincode', async () => {
    const { userRepo, studentRepo, auditRecorder } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());

    const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
    const result = await uc.execute({
      ...validInput,
      address: { ...validInput.address, pincode: '12345' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  // L4 (student-management audit) — create-student must enforce the same
  // length / format caps as update-student, otherwise the create endpoint
  // is an easy bypass for the new guards. We pin two representative
  // fields here; the comprehensive validator-by-validator coverage lives
  // on the update-student spec.
  describe('L4: field-length / format validation', () => {
    it('rejects fatherName longer than 100 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());

      const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({ ...validInput, fatherName: 'Z'.repeat(101) });

      expect(result.ok).toBe(false);
      expect(studentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects whatsappNumber that is not E.164', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());

      const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({ ...validInput, whatsappNumber: '9999999999' });

      expect(result.ok).toBe(false);
      expect(studentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects address.line1 longer than 100 characters', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());

      const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        ...validInput,
        address: { ...validInput.address, line1: 'X'.repeat(101) },
      });

      expect(result.ok).toBe(false);
      expect(studentRepo.save).not.toHaveBeenCalled();
    });
  });

  // H2b (enquiry-management audit follow-up): emails must be normalized to
  // lowercase BEFORE both the dedup query and storage. Otherwise the
  // mongo-student.repository lowercases on lookup but mismatches a stored
  // "Rohit@example.com" against a search for "rohit@example.com", letting
  // a duplicate through. update-student already normalizes; this brings
  // create into agreement.
  describe('H2b: email normalization on create', () => {
    it('stores student.email in lowercase even if caller supplies mixed case', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());

      const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
      const result = await uc.execute({
        ...validInput,
        email: '  Rohit.Kumar@Example.COM  ',
      });

      expect(result.ok).toBe(true);
      const savedStudent = studentRepo.save.mock.calls[0]![0];
      expect(savedStudent.email).toBe('rohit.kumar@example.com');
    });

    it('passes lowercase email to the dedup query (regression for mixed-case bypass)', async () => {
      const { userRepo, studentRepo, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());

      const uc = new CreateStudentUseCase(userRepo, studentRepo, auditRecorder);
      await uc.execute({ ...validInput, email: 'Rohit@Example.COM' });

      // First arg is academyId, second is the email to look up.
      expect(studentRepo.findByEmailInAcademy).toHaveBeenCalledWith(
        'academy-1',
        'rohit@example.com',
      );
    });
  });
});
