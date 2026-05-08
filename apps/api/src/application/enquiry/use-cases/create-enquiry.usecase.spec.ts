import { CreateEnquiryUseCase } from './create-enquiry.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import { User } from '@domain/identity/entities/user.entity';

describe('CreateEnquiryUseCase', () => {
  let userRepo: jest.Mocked<UserRepository>;
  let enquiryRepo: jest.Mocked<EnquiryRepository>;

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      save: jest.fn(),
      updateAcademyId: jest.fn(),
      listByAcademyAndRole: jest.fn(),
      countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
      incrementTokenVersionByAcademyId: jest.fn(),
      incrementTokenVersionByUserId: jest.fn(),
      listByAcademyId: jest.fn(),
      anonymizeAndSoftDelete: jest.fn(),
    } as jest.Mocked<UserRepository>;

    enquiryRepo = {
      save: jest.fn(),
      saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
      findById: jest.fn(),
      findActiveByMobileAndAcademy: jest.fn().mockResolvedValue(null),
      list: jest.fn(),
      summary: jest.fn(),
    } as jest.Mocked<EnquiryRepository>;
  });

  // Phone-VO validates strictly; pre-built valid numbers per id keep
  // fixtures consistent without coupling tests to phone-format internals.
  const VALID_PHONES: Record<string, string> = {
    'staff-1': '+919876500001',
    'staff-2': '+919876500002',
    'owner-1': '+919876500003',
    'owner-2': '+919876500004',
  };

  function makeUser(id: string, role: 'OWNER' | 'STAFF' | 'PARENT', academyId = 'academy-1') {
    const u = User.create({
      id,
      fullName: `${role} ${id}`,
      email: `${id}@e.com`,
      phoneNumber: VALID_PHONES[id] ?? '+919876500099',
      role,
      passwordHash: 'h',
    });
    return User.reconstitute(id, { ...u['props'], academyId });
  }

  function makeUseCase(pushService?: { sendToUsers: jest.Mock }) {
    const auditRecorder = { record: jest.fn() };
    return new CreateEnquiryUseCase(
      userRepo,
      enquiryRepo,
      auditRecorder,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pushService as any,
    );
  }

  const VALID_INPUT = {
    actorUserId: 'staff-1',
    actorRole: 'STAFF' as const,
    prospectName: 'New Lead',
    mobileNumber: '9876543210',
    source: 'WALK_IN' as const,
  };

  it('creates an enquiry on the happy path', async () => {
    userRepo.findById.mockResolvedValue(makeUser('staff-1', 'STAFF'));
    userRepo.listByAcademyAndRole.mockResolvedValue({ users: [], total: 0 });

    const uc = makeUseCase();
    const result = await uc.execute(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.prospectName).toBe('New Lead');
      expect(result.value.status).toBe('ACTIVE');
    }
    expect(enquiryRepo.save).toHaveBeenCalled();
  });

  it('rejects PARENT role', async () => {
    const uc = makeUseCase();
    const result = await uc.execute({ ...VALID_INPUT, actorRole: 'PARENT' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(enquiryRepo.save).not.toHaveBeenCalled();
  });

  it('rejects too-short prospect name', async () => {
    userRepo.findById.mockResolvedValue(makeUser('staff-1', 'STAFF'));
    const uc = makeUseCase();
    const result = await uc.execute({ ...VALID_INPUT, prospectName: 'A' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });

  it('rejects malformed mobile number', async () => {
    userRepo.findById.mockResolvedValue(makeUser('staff-1', 'STAFF'));
    const uc = makeUseCase();
    const result = await uc.execute({ ...VALID_INPUT, mobileNumber: 'not-a-phone' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });

  describe('owner + staff push on creation', () => {
    function makeOwner(id: string) {
      return makeUser(id, 'OWNER');
    }
    function makeStaff(id: string) {
      return makeUser(id, 'STAFF');
    }

    it('pushes to all owners and staff except the actor', async () => {
      userRepo.findById.mockResolvedValue(makeStaff('staff-1'));
      userRepo.listByAcademyAndRole
        .mockResolvedValueOnce({ users: [makeOwner('owner-1'), makeOwner('owner-2')], total: 2 })
        .mockResolvedValueOnce({
          users: [makeStaff('staff-1'), makeStaff('staff-2')],
          total: 2,
        });

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);
      const result = await uc.execute(VALID_INPUT);

      expect(result.ok).toBe(true);
      // Recipients: owner-1, owner-2, staff-2 — staff-1 (the actor) is filtered out.
      expect(pushService.sendToUsers).toHaveBeenCalledWith(
        ['owner-1', 'owner-2', 'staff-2'],
        expect.objectContaining({
          title: 'New enquiry',
          data: expect.objectContaining({ type: 'ENQUIRY_NEW' }),
        }),
      );
    });

    it('does not push when no recipients exist (only the actor in the academy)', async () => {
      userRepo.findById.mockResolvedValue(makeStaff('staff-1'));
      userRepo.listByAcademyAndRole
        .mockResolvedValueOnce({ users: [], total: 0 })
        .mockResolvedValueOnce({ users: [makeStaff('staff-1')], total: 1 });

      const pushService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
      const uc = makeUseCase(pushService);
      const result = await uc.execute(VALID_INPUT);

      expect(result.ok).toBe(true);
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('returns ok even when push throws — enquiry creation must not fail', async () => {
      userRepo.findById.mockResolvedValue(makeStaff('staff-1'));
      userRepo.listByAcademyAndRole.mockResolvedValue({
        users: [makeOwner('owner-1')],
        total: 1,
      });

      const pushService = {
        sendToUsers: jest.fn().mockRejectedValue(new Error('FCM down')),
      };
      const uc = makeUseCase(pushService);
      const result = await uc.execute(VALID_INPUT);

      expect(result.ok).toBe(true);
      expect(enquiryRepo.save).toHaveBeenCalled();
    });
  });
});
