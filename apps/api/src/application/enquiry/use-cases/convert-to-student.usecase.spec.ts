import { ConvertToStudentUseCase } from './convert-to-student.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { TransactionPort } from '../../common/transaction.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { Enquiry } from '@domain/enquiry/entities/enquiry.entity';
import { Student } from '@domain/student/entities/student.entity';

function createOwner(academyId: string | null = 'academy-1'): User {
  const base = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  if (academyId) return User.reconstitute('owner-1', { ...base['props'], academyId });
  return base;
}

function createEnquiry(): Enquiry {
  return Enquiry.create({
    id: 'enq-1',
    academyId: 'academy-1',
    prospectName: 'Rohit Kumar',
    mobileNumber: '9876543210',
    email: 'rohit@example.com',
    createdBy: 'owner-1',
  });
}

function createDuplicateStudent(): Student {
  return Student.create({
    id: 'existing-student-1',
    academyId: 'academy-1',
    fullName: 'Other Kid',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: 'X', city: 'Y', state: 'Z', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '9876543210', email: 'rohit@example.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
    email: 'rohit@example.com',
    mobileNumber: '9876543210',
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
  const enquiryRepo: jest.Mocked<EnquiryRepository> = {
    save: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    findActiveByMobileAndAcademy: jest.fn(),
    list: jest.fn(),
    summary: jest.fn(),
  };
  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    countScheduledStudentsByAcademyAndDate: jest.fn().mockResolvedValue(0),
    findByIds: jest.fn(),
    findBirthdaysByAcademy: jest.fn(),
    findByEmailInAcademy: jest.fn().mockResolvedValue(null),
    findByPhoneInAcademy: jest.fn().mockResolvedValue(null),
    countInactiveByAcademy: jest.fn(),
    countNewAdmissionsByAcademyAndDateRange: jest.fn(),
    saveWithVersionPrecondition: jest.fn(),
  };
  // Pass-through transaction.
  const transaction: TransactionPort = {
    run: async <T>(fn: () => Promise<T>) => fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, enquiryRepo, studentRepo, transaction, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new ConvertToStudentUseCase(
    deps.userRepo,
    deps.enquiryRepo,
    deps.studentRepo,
    deps.transaction,
    deps.audit,
  );
}

const validInput = {
  actorUserId: 'owner-1',
  actorRole: 'OWNER' as const,
  enquiryId: 'enq-1',
  joiningDate: '2026-06-01',
  monthlyFee: 1500,
  dateOfBirth: '2014-05-15',
  gender: 'MALE' as const,
  addressLine1: '123 Main Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
};

describe('ConvertToStudentUseCase', () => {
  it('converts the enquiry to a student on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(true);
    expect(deps.studentRepo.save).toHaveBeenCalled();
    expect(deps.enquiryRepo.saveWithVersionPrecondition).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ENQUIRY_CONVERTED' }),
    );
  });

  // H1 regression: fractional fees must be rejected (matches student rules
  // integer invariant). Prior code accepted any > 0 number.
  it('H1: rejects fractional monthlyFee (integer required)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({ ...validInput, monthlyFee: 99.5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  it('H1: rejects invalid pincode (wrong length)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({ ...validInput, pincode: '12345' });

    expect(result.ok).toBe(false);
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  it('H1: rejects address line longer than 100 chars', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      ...validInput,
      addressLine1: 'X'.repeat(101),
    });

    expect(result.ok).toBe(false);
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  it('H1: rejects city longer than 50 chars', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({ ...validInput, city: 'X'.repeat(51) });

    expect(result.ok).toBe(false);
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  // H2 regression: dedup against existing students in the academy.
  it('H2: rejects when a student with same email already exists', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());
    deps.studentRepo.findByEmailInAcademy.mockResolvedValue(createDuplicateStudent());

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  it('H2: rejects when a student with same phone already exists', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());
    // Email check passes, phone check fails.
    deps.studentRepo.findByEmailInAcademy.mockResolvedValue(null);
    deps.studentRepo.findByPhoneInAcademy.mockResolvedValue(createDuplicateStudent());

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({ ...validInput, actorRole: 'STAFF' });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects when enquiry is already closed (without retry-safe match)', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const closed = createEnquiry().close('NOT_INTERESTED', 'owner-1', new Date());
    deps.enquiryRepo.findById.mockResolvedValue(closed);

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(false);
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });

  // Retry-safe path: previously converted, response was lost, client retries.
  it('returns the existing studentId when called again on an already-converted enquiry', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const converted = createEnquiry().close('CONVERTED', 'owner-1', new Date(), 'student-XYZ');
    deps.enquiryRepo.findById.mockResolvedValue(converted);
    deps.studentRepo.findById.mockResolvedValue(createDuplicateStudent());

    const result = await makeUc(deps).execute(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.studentId).toBe('student-XYZ');
    }
    // Must NOT create another student.
    expect(deps.studentRepo.save).not.toHaveBeenCalled();
  });
});
