import { CloseEnquiryUseCase } from './close-enquiry.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { User } from '@domain/identity/entities/user.entity';
import { Enquiry } from '@domain/enquiry/entities/enquiry.entity';

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
    createdBy: 'owner-1',
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
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, enquiryRepo, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new CloseEnquiryUseCase(deps.userRepo, deps.enquiryRepo, deps.audit);
}

describe('CloseEnquiryUseCase', () => {
  it('closes the enquiry with NOT_INTERESTED on the happy path', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      closureReason: 'NOT_INTERESTED',
    });

    expect(result.ok).toBe(true);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ENQUIRY_CLOSED',
        context: expect.objectContaining({ closureReason: 'NOT_INTERESTED' }),
      }),
    );
  });

  it('closes with OTHER reason', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      closureReason: 'OTHER',
    });

    expect(result.ok).toBe(true);
  });

  // H3 regression: manual close with CONVERTED is forbidden — conversion
  // must go through convert-to-student so the enquiry+student link is
  // properly established.
  it('H3: rejects manual close with closureReason CONVERTED', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      closureReason: 'CONVERTED',
      convertedStudentId: 'some-student-id',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    // The early-return must fire before any lookup or save.
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
    expect(deps.enquiryRepo.findById).not.toHaveBeenCalled();
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('rejects non-OWNER roles', async () => {
    const deps = buildDeps();
    const result = await makeUc(deps).execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      enquiryId: 'enq-1',
      closureReason: 'NOT_INTERESTED',
    });
    expect(result.ok).toBe(false);
    expect(deps.userRepo.findById).not.toHaveBeenCalled();
  });

  it('rejects when enquiry is already closed', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const alreadyClosed = createEnquiry().close('NOT_INTERESTED', 'owner-1', new Date());
    deps.enquiryRepo.findById.mockResolvedValue(alreadyClosed);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      closureReason: 'NOT_INTERESTED',
    });

    expect(result.ok).toBe(false);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });
});
