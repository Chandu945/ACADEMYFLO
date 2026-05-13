import { UpdateAcademySettingsUseCase } from './update-academy-settings.usecase';
import {
  InMemoryUserRepository,
  InMemoryAcademyRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Academy } from '@domain/academy/entities/academy.entity';

function createOwner(id = 'owner-1', academyId = 'academy-1'): User {
  const u = User.create({
    id,
    fullName: 'Owner',
    email: `${id}@test.com`,
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hash',
  });
  return User.reconstitute(id, { ...u['props'], academyId });
}

function createAcademy(): Academy {
  return Academy.create({
    id: 'academy-1',
    ownerUserId: 'owner-1',
    academyName: 'Test',
    address: { line1: '1', city: 'C', state: 'S', pincode: '400001', country: 'India' },
  });
}

describe('UpdateAcademySettingsUseCase (M3 audit + M5 CAS save)', () => {
  let userRepo: InMemoryUserRepository;
  let academyRepo: InMemoryAcademyRepository;
  let audit: { record: jest.Mock };
  let useCase: UpdateAcademySettingsUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    academyRepo = new InMemoryAcademyRepository();
    await userRepo.save(createOwner());
    await academyRepo.save(createAcademy());
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    useCase = new UpdateAcademySettingsUseCase(userRepo, academyRepo, audit);
  });

  it('M3: records ACADEMY_SETTINGS_UPDATED with the new values + previous late-fee snapshot', async () => {
    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      lateFeeEnabled: true,
      lateFeeAmountInr: 50,
      gracePeriodDays: 7,
    });

    expect(result.ok).toBe(true);
    expect(audit.record).toHaveBeenCalledTimes(1);
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toEqual(
      expect.objectContaining({
        action: 'ACADEMY_SETTINGS_UPDATED',
        entityType: 'ACADEMY',
        context: expect.objectContaining({
          lateFeeAmountInr: '50',
          lateFeeEnabled: 'true',
          gracePeriodDays: '7',
          previousLateFeeAmountInr: '0',
          previousLateFeeEnabled: 'false',
        }),
      }),
    );
  });

  it('M5: returns CONFLICT when the version race fires', async () => {
    // saveWithVersionPrecondition refuses the write when the persisted
    // version diverged from the one we loaded. We simulate that by
    // returning false from the in-memory CAS.
    jest.spyOn(academyRepo, 'saveWithVersionPrecondition').mockResolvedValueOnce(false);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      lateFeeAmountInr: 99,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
      expect(result.error.message).toMatch(/modified by someone else/i);
    }
    // No audit row on a lost-race write — the winner's update is the
    // authoritative one and recorded its own audit entry.
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects non-owner actors', async () => {
    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'STAFF',
      lateFeeAmountInr: 50,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });
});
