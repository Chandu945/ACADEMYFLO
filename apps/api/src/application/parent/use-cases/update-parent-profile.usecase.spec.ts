import { UpdateParentProfileUseCase } from './update-parent-profile.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';

function createParent(): User {
  const u = User.create({
    id: 'parent-1',
    fullName: 'Parent Name',
    email: 'parent@test.com',
    phoneNumber: '+919876543210',
    role: 'PARENT',
    passwordHash: 'hash',
  });
  return User.reconstitute('parent-1', { ...u['props'], academyId: 'academy-1' });
}

describe('UpdateParentProfileUseCase (M3: audit on profile update)', () => {
  let userRepo: InMemoryUserRepository;
  let audit: { record: jest.Mock };
  let useCase: UpdateParentProfileUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    await userRepo.save(createParent());
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    useCase = new UpdateParentProfileUseCase(userRepo, audit);
  });

  it('rejects non-PARENT actors as FORBIDDEN', async () => {
    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'OWNER',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('records USER_PROFILE_UPDATED with the changed fields list', async () => {
    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      fullName: 'New Name',
    });
    expect(result.ok).toBe(true);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'academy-1',
        actorUserId: 'parent-1',
        action: 'USER_PROFILE_UPDATED',
        entityType: 'USER',
        entityId: 'parent-1',
        context: expect.objectContaining({
          role: 'PARENT',
          changedFields: 'fullName',
        }),
      }),
    );
  });

  it('records both fields when name AND phone change', async () => {
    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      fullName: 'New Name',
      phoneNumber: '+919999999999',
    });
    expect(result.ok).toBe(true);
    const ctx = audit.record.mock.calls[0][0].context;
    expect(ctx.changedFields).toBe('fullName,phoneNumber');
  });

  it('does NOT audit when nothing actually changed (resubmit of identical values)', async () => {
    // M3 design choice: avoid filling the audit feed with no-op rows. The
    // save still happens (it's a cheap no-op via optimistic concurrency)
    // but the audit row would just be noise.
    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      fullName: 'Parent Name',
      phoneNumber: '+919876543210',
    });
    expect(result.ok).toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('works without auditRecorder (legacy fixture)', async () => {
    const legacy = new UpdateParentProfileUseCase(userRepo);
    const result = await legacy.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      fullName: 'New Name',
    });
    expect(result.ok).toBe(true);
  });
});
