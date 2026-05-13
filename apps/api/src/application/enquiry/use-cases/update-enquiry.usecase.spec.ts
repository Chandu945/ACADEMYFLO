import { UpdateEnquiryUseCase } from './update-enquiry.usecase';
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

function createEnquiry(overrides: Partial<{ id: string; mobileNumber: string }> = {}): Enquiry {
  return Enquiry.create({
    id: overrides.id ?? 'enq-1',
    academyId: 'academy-1',
    prospectName: 'Rohit Kumar',
    mobileNumber: overrides.mobileNumber ?? '9876543210',
    email: 'rohit@example.com',
    interestedIn: 'Football',
    source: 'WALK_IN',
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
    findActiveByMobileAndAcademy: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    summary: jest.fn(),
  };
  const audit: jest.Mocked<AuditRecorderPort> = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { userRepo, enquiryRepo, audit };
}

function makeUc(deps: ReturnType<typeof buildDeps>) {
  return new UpdateEnquiryUseCase(deps.userRepo, deps.enquiryRepo, deps.audit);
}

describe('UpdateEnquiryUseCase', () => {
  // M2 regression: audit context must list which fields changed.
  it('M2: records changedFields in audit context', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      prospectName: 'Rohit K.',
      interestedIn: 'Cricket',
    });

    expect(result.ok).toBe(true);
    const auditCall = deps.audit.record.mock.calls[0]![0];
    expect(auditCall.action).toBe('ENQUIRY_UPDATED');
    const changedFields = auditCall.context?.['changedFields'] ?? '';
    expect(changedFields).toMatch(/prospectName/);
    expect(changedFields).toMatch(/interestedIn/);
    // Did not change — must NOT appear.
    expect(changedFields).not.toMatch(/mobileNumber/);
    expect(changedFields).not.toMatch(/email/);
  });

  // M3 regression: no-op skip when nothing actually changed.
  it('M3: no-op skip when input fields match current state', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      // Same values as the existing enquiry
      prospectName: 'Rohit Kumar',
      mobileNumber: '9876543210',
      email: 'rohit@example.com',
    });

    expect(result.ok).toBe(true);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  it('M3: no-op skip when only undefined fields are supplied', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
    });

    expect(result.ok).toBe(true);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
    expect(deps.audit.record).not.toHaveBeenCalled();
  });

  // M4 regression: changing mobile to one that collides with another active
  // enquiry must hard-reject with CONFLICT rather than silently creating a
  // duplicate-mobile situation.
  it('M4: rejects when new mobile collides with another active enquiry', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry({ id: 'enq-1' }));
    // A different active enquiry already uses the new mobile.
    deps.enquiryRepo.findActiveByMobileAndAcademy.mockResolvedValue(
      createEnquiry({ id: 'enq-2', mobileNumber: '9999999999' }),
    );

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      mobileNumber: '9999999999',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });

  it('M4: does NOT re-check when mobile is unchanged', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry({ mobileNumber: '9876543210' }));

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      // Same mobile as stored
      mobileNumber: '9876543210',
      prospectName: 'Rohit Kumar 2',
    });

    expect(result.ok).toBe(true);
    expect(deps.enquiryRepo.findActiveByMobileAndAcademy).not.toHaveBeenCalled();
  });

  it('M4: allows mobile change when no collision exists', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.enquiryRepo.findById.mockResolvedValue(createEnquiry());
    deps.enquiryRepo.findActiveByMobileAndAcademy.mockResolvedValue(null);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      mobileNumber: '9000000000',
    });

    expect(result.ok).toBe(true);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).toHaveBeenCalled();
  });

  it('rejects when enquiry is already closed', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const closed = createEnquiry().close('NOT_INTERESTED', 'owner-1', new Date());
    deps.enquiryRepo.findById.mockResolvedValue(closed);

    const result = await makeUc(deps).execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      enquiryId: 'enq-1',
      prospectName: 'New Name',
    });

    expect(result.ok).toBe(false);
    expect(deps.enquiryRepo.saveWithVersionPrecondition).not.toHaveBeenCalled();
  });
});
