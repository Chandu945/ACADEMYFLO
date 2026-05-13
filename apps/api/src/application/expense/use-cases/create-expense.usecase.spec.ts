import { CreateExpenseUseCase } from './create-expense.usecase';
import { UpdateExpenseUseCase } from './update-expense.usecase';
import { DeleteExpenseUseCase } from './delete-expense.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Expense } from '@domain/expense/entities/expense.entity';
import { ExpenseCategory } from '@domain/expense/entities/expense-category.entity';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
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

function createCategory(
  id = '11111111-2222-3333-4444-555555555555',
  academyId = 'academy-1',
  name = 'Travel',
): ExpenseCategory {
  return ExpenseCategory.create({ id, academyId, name, createdBy: 'owner-1' });
}

function buildExpenseRepo(): jest.Mocked<ExpenseRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    listByAcademy: jest.fn(),
    sumByAcademyAndMonth: jest.fn(),
    sumByAcademyAndDateRange: jest.fn(),
    sumByAcademyGroupedByMonth: jest.fn(),
    summarizeByCategory: jest.fn(),
    countByCategoryId: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
  };
}

function buildCategoryRepo(): jest.Mocked<ExpenseCategoryRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
}

describe('Expense CRUD audit context (M2 expense audit fix)', () => {
  let userRepo: InMemoryUserRepository;
  let expenseRepo: jest.Mocked<ExpenseRepository>;
  let categoryRepo: jest.Mocked<ExpenseCategoryRepository>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    await userRepo.save(createOwner());
    expenseRepo = buildExpenseRepo();
    categoryRepo = buildCategoryRepo();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
  });

  it('M2: EXPENSE_CREATED records categoryId, categoryName, amount, date', async () => {
    // Forensic question: "show me all expenses in category X from the
    // audit feed without joining the expense table." Pre-fix the context
    // was empty; now it carries the snapshot at creation time.
    categoryRepo.findById.mockResolvedValue(createCategory());
    const uc = new CreateExpenseUseCase(userRepo, expenseRepo, categoryRepo, audit);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      categoryId: '11111111-2222-3333-4444-555555555555',
      // A date that's deterministic relative to test runtime: yesterday.
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      amount: 500,
      notes: null,
    });

    expect(result.ok).toBe(true);
    expect(audit.record).toHaveBeenCalledTimes(1);
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toEqual(
      expect.objectContaining({
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        context: expect.objectContaining({
          categoryId: '11111111-2222-3333-4444-555555555555',
          categoryName: 'Travel',
          amount: '500',
        }),
      }),
    );
    expect(entry.context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('M2: EXPENSE_UPDATED records the new values AND the previous snapshot', async () => {
    // The diff is what makes the audit row standalone-useful. Without the
    // previous-* fields you'd need to walk the row's history to see what
    // changed; with them, the question is answered by the row alone.
    const expense = Expense.create({
      id: 'e1',
      academyId: 'academy-1',
      date: '2024-01-15',
      categoryId: '11111111-2222-3333-4444-555555555555',
      categoryName: 'Travel',
      amount: 500,
      notes: null,
      createdBy: 'owner-1',
    });
    expenseRepo.findById.mockResolvedValue(expense);
    categoryRepo.findById.mockResolvedValue(
      createCategory('66666666-7777-8888-9999-aaaaaaaaaaaa', 'academy-1', 'Supplies'),
    );

    const uc = new UpdateExpenseUseCase(userRepo, expenseRepo, categoryRepo, audit);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      expenseId: 'e1',
      categoryId: '66666666-7777-8888-9999-aaaaaaaaaaaa',
      amount: 750,
      date: '2024-01-16',
    });

    expect(result.ok).toBe(true);
    const ctx = audit.record.mock.calls[0][0].context;
    // Post-update values
    expect(ctx.categoryId).toBe('66666666-7777-8888-9999-aaaaaaaaaaaa');
    expect(ctx.categoryName).toBe('Supplies');
    expect(ctx.amount).toBe('750');
    expect(ctx.date).toBe('2024-01-16');
    // Pre-update snapshot
    expect(ctx.previousCategoryId).toBe('11111111-2222-3333-4444-555555555555');
    expect(ctx.previousAmount).toBe('500');
    expect(ctx.previousDate).toBe('2024-01-15');
  });

  it('M2: EXPENSE_DELETED records the snapshot at deletion time', async () => {
    // Soft-deleted rows may later be hard-purged in a compliance scan; the
    // audit row should remain self-contained ("who deleted the ₹50000 row
    // in Travel last quarter?").
    const expense = Expense.create({
      id: 'e1',
      academyId: 'academy-1',
      date: '2024-01-15',
      categoryId: '11111111-2222-3333-4444-555555555555',
      categoryName: 'Travel',
      amount: 500,
      notes: 'hotel',
      createdBy: 'owner-1',
    });
    expenseRepo.findById.mockResolvedValue(expense);

    const uc = new DeleteExpenseUseCase(userRepo, expenseRepo, audit);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      expenseId: 'e1',
    });

    expect(result.ok).toBe(true);
    const ctx = audit.record.mock.calls[0][0].context;
    expect(ctx).toEqual(
      expect.objectContaining({
        categoryId: '11111111-2222-3333-4444-555555555555',
        categoryName: 'Travel',
        amount: '500',
        date: '2024-01-15',
      }),
    );
  });
});
