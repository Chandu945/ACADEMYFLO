import { CreateCategoryUseCase } from './create-category.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { ExpenseCategory } from '@domain/expense/entities/expense-category.entity';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';

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

function buildCategoryRepo(): jest.Mocked<ExpenseCategoryRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByAcademyAndName: jest.fn().mockResolvedValue(null),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
}

describe('CreateCategoryUseCase (M1: duplicate-category race + 11000 mapping)', () => {
  let userRepo: InMemoryUserRepository;
  let categoryRepo: jest.Mocked<ExpenseCategoryRepository>;
  let audit: { record: jest.Mock };
  let useCase: CreateCategoryUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    await userRepo.save(createOwner());
    categoryRepo = buildCategoryRepo();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    useCase = new CreateCategoryUseCase(userRepo, categoryRepo, audit);
  });

  const baseInput = {
    actorUserId: 'owner-1',
    actorRole: 'OWNER' as const,
    name: 'Travel',
  };

  it('creates the category on the happy path', async () => {
    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(true);
    expect(categoryRepo.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('blocks via the JS findByAcademyAndName pre-save check when no race', async () => {
    // Single-request happy-sad path: the case-insensitive JS check still
    // catches the obvious case where a duplicate already exists. Faster
    // and gives a typed error before hitting the DB.
    categoryRepo.findByAcademyAndName.mockResolvedValueOnce(
      ExpenseCategory.create({
        id: 'c1',
        academyId: 'academy-1',
        name: 'Travel',
        createdBy: 'owner-1',
      }),
    );

    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
      expect(result.error.message).toMatch(/already exists/i);
    }
    expect(categoryRepo.save).not.toHaveBeenCalled();
  });

  it('M1: maps a Mongo 11000 duplicate-key error to duplicateCategory (TOCTOU race)', async () => {
    // The race that motivated M1: pre-fix, two concurrent requests both
    // pass the case-insensitive JS check (it's a read), then both call
    // save. The case-sensitive legacy index lets "Travel" + "travel"
    // through; the new (academyId, nameNormalized) partial unique catches
    // them. We then need to map 11000 to a typed CONFLICT rather than a
    // 500 — that's what this test guards.
    categoryRepo.findByAcademyAndName.mockResolvedValue(null);
    categoryRepo.save.mockRejectedValueOnce(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
    // No audit row for the loser of the race — winner already recorded it.
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('propagates non-11000 save errors as throws (no swallow)', async () => {
    // Scope the 11000 handler tightly. A generic Mongo failure (network,
    // validation) should NOT be silently converted to a successful return.
    categoryRepo.findByAcademyAndName.mockResolvedValue(null);
    categoryRepo.save.mockRejectedValueOnce(new Error('mongo timeout'));

    await expect(useCase.execute(baseInput)).rejects.toThrow(/mongo timeout/);
  });

  it('rejects non-OWNER actors', async () => {
    const result = await useCase.execute({ ...baseInput, actorRole: 'STAFF' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });
});
