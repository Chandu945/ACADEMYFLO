import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRole } from '@academyflo/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import { canManageExpenses } from '@domain/expense/rules/expense.rules';
import { ExpenseErrors } from '@domain/expense/errors/expense.errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface DeleteCategoryInput {
  actorUserId: string;
  actorRole: UserRole;
  categoryId: string;
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly categoryRepo: ExpenseCategoryRepository,
    private readonly expenseRepo: ExpenseRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<Result<{ deleted: boolean }, AppError>> {
    const check = canManageExpenses(input.actorRole);
    if (!check.allowed) return err(ExpenseErrors.notAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(ExpenseErrors.academyRequired());

    const category = await this.categoryRepo.findById(input.categoryId);
    if (!category || category.academyId !== user.academyId) {
      return err(ExpenseErrors.categoryNotFound(input.categoryId));
    }

    const expenseCount = await this.expenseRepo.countByCategoryId(user.academyId, input.categoryId);
    if (expenseCount > 0) {
      return err(ExpenseErrors.categoryInUse());
    }

    await this.categoryRepo.deleteById(input.categoryId);

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'EXPENSE_CATEGORY_DELETED',
      entityType: 'EXPENSE',
      entityId: input.categoryId,
      context: { name: category.name },
    });

    return ok({ deleted: true });
  }
}
